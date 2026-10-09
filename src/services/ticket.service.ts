import { TicketPriority, TicketStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error.middleware.js";
import { accessService, type AccessUser } from "./access.service.js";
import { notificationService } from "./notification.service.js";

/**
 * Regras de acesso a chamados (no Supabase eram as policies de service_tickets e filhas):
 * - ver, abrir, conversar, anexar e vincular produtos: quem acessa o contrato do chamado
 * - alterar status, prioridade, custo, fornecedor, atender e gerir etapas: admin e suprimentos
 * - apagar chamado e apagar mensagem: só super_admin
 * - apagar anexo: quem enviou, admin ou suprimentos
 * - mensagem interna: só admin e suprimentos escrevem e leem
 */
export class TicketService {
  private ticketScope(user: AccessUser) {
    return { contract: accessService.contractFilter(user) };
  }

  /** Chamado dentro do escopo do usuário; 404 se não existir ou for de outro contrato/regional. */
  private async assertTicketAccess(user: AccessUser, ticketId: string) {
    if (typeof ticketId !== "string" || !ticketId) {
      throw new AppError(400, "Chamado é obrigatório.");
    }
    const ticket = await prisma.serviceTicket.findFirst({
      where: { AND: [{ id: ticketId }, this.ticketScope(user)] },
      select: { id: true, title: true, status: true, flowId: true, createdById: true, autoSyncCost: true },
    });
    if (!ticket) {
      throw new AppError(404, "Chamado não encontrado.");
    }
    return ticket;
  }

  private assertStaff(user: AccessUser) {
    if (!accessService.isSuprimentos(user)) {
      throw new AppError(403, "Somente suprimentos ou administradores podem fazer essa alteração.");
    }
  }

  private assertSuperAdmin(user: AccessUser) {
    if (user.role !== "super_admin") {
      throw new AppError(403, "Somente o super administrador pode fazer essa exclusão.");
    }
  }

  async listTickets(
    user: AccessUser,
    params?: { contractId?: string; regionalId?: string; status?: string; priority?: string },
  ) {
    const where: any = { AND: [this.ticketScope(user)] };
    if (params?.contractId) where.AND.push({ contractId: params.contractId });
    if (params?.regionalId) where.AND.push({ regionalId: params.regionalId });
    if (params?.status) {
      if (!(Object.values(TicketStatus) as string[]).includes(params.status)) {
        throw new AppError(400, "Status inválido.");
      }
      where.AND.push({ status: params.status });
    }
    if (params?.priority) {
      if (!(Object.values(TicketPriority) as string[]).includes(params.priority)) {
        throw new AppError(400, "Prioridade inválida.");
      }
      where.AND.push({ priority: params.priority });
    }

    const tickets = await prisma.serviceTicket.findMany({
      where,
      include: {
        contract: { include: { regional: true } },
        regional: true,
        type: true,
        flow: true,
        supplier: true,
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        steps: { orderBy: { order: "asc" } },
        products: { include: { product: { select: { name: true, codigo: true, unidade: true } } } },
        _count: { select: { messages: true, steps: true, attachments: true, products: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return tickets.map((t) => this.formatTicket(t));
  }

  async getTicketById(user: AccessUser, id: string) {
    const t = await prisma.serviceTicket.findFirst({
      where: { AND: [{ id }, this.ticketScope(user)] },
      include: {
        contract: { include: { regional: true } },
        regional: true,
        type: true,
        flow: true,
        supplier: true,
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        steps: { orderBy: { order: "asc" } },
        messages: {
          where: accessService.isSuprimentos(user) ? undefined : { isInternal: false },
          include: { user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } } },
          orderBy: { createdAt: "asc" },
        },
        attachments: true,
        products: { include: { product: { select: { name: true, codigo: true, unidade: true } } } },
      },
    });

    if (!t) {
      throw new AppError(404, "Chamado não encontrado.");
    }

    return this.formatTicket(t);
  }

  async createTicket(
    user: AccessUser,
    data: {
      contractId: string;
      title: string;
      description: string;
      priority?: TicketPriority;
      ticketTypeId?: string | null;
    },
  ) {
    const userId = user.userId;
    const contractId = data.contractId;
    if (!contractId) {
      throw new AppError(400, "Contrato é obrigatório.");
    }

    const contract = await accessService.assertContractAccess(user, contractId);

    const typeId = data.ticketTypeId || undefined;
    let slaHours = 48;
    if (typeId) {
      const type = await prisma.ticketType.findUnique({ where: { id: typeId } });
      if (!type) {
        throw new AppError(400, "Tipo de chamado não encontrado.");
      }
      slaHours = type.slaHours;
    }

    const ticket = await prisma.serviceTicket.create({
      data: {
        title: data.title,
        description: data.description,
        contractId,
        regionalId: contract.regionalId,
        typeId,
        priority: data.priority || "media",
        slaHours,
        createdById: userId,
        status: "aberto",
      },
      include: {
        contract: true,
        regional: true,
        type: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    await notificationService.ticketCreated({
      ticketId: ticket.id,
      title: ticket.title,
      contractName: ticket.contract?.name ?? null,
      regionalId: ticket.regionalId,
      actorId: userId,
    });

    return this.formatTicket(ticket);
  }

  /** Avisa quem abriu o chamado quando o status ou o fluxo mudou (o que os métodos abaixo fazem). */
  private async notifyIfTicketChanged(
    before: { status: TicketStatus; flowId: string | null } | null,
    after: { id: string; title: string; createdById: string; status: TicketStatus; flowId: string | null },
  ) {
    if (!before || (before.status === after.status && before.flowId === after.flowId)) return;
    await notificationService.ticketStatusChanged({
      ticketId: after.id,
      title: after.title,
      creatorId: after.createdById,
      status: after.status,
    });
  }

  async updateStatus(user: AccessUser, id: string, status: TicketStatus) {
    this.assertStaff(user);
    const before = await this.assertTicketAccess(user, id);
    const ticket = await prisma.serviceTicket.update({
      where: { id },
      data: {
        status,
        resolvedAt: status === "concluido" ? new Date() : undefined,
      },
      include: { contract: true, type: true, supplier: true },
    });
    await this.notifyIfTicketChanged(before, ticket);
    return this.formatTicket(ticket);
  }

  async updatePriority(user: AccessUser, id: string, priority: TicketPriority) {
    this.assertStaff(user);
    await this.assertTicketAccess(user, id);
    const ticket = await prisma.serviceTicket.update({
      where: { id },
      data: { priority },
      include: { contract: true, type: true, supplier: true },
    });
    return this.formatTicket(ticket);
  }

  async updateCost(user: AccessUser, id: string, data: { finalCost?: number | null; autoSyncCost?: boolean }) {
    this.assertStaff(user);
    await this.assertTicketAccess(user, id);
    const ticket = await prisma.serviceTicket.update({
      where: { id },
      data: {
        finalCost: data.finalCost,
        autoSyncCost: data.autoSyncCost,
      },
      include: { contract: true, type: true, supplier: true },
    });
    return this.formatTicket(ticket);
  }

  async updateSupplier(
    user: AccessUser,
    id: string,
    data: { supplierId: string | null; supplierNameSnapshot?: string | null },
  ) {
    this.assertStaff(user);
    await this.assertTicketAccess(user, id);
    if (data?.supplierId && (await prisma.registeredSupplier.count({ where: { id: data.supplierId } })) === 0) {
      throw new AppError(400, "Fornecedor não encontrado.");
    }
    const ticket = await prisma.serviceTicket.update({
      where: { id },
      data: {
        supplierId: data.supplierId,
        supplierNameSnapshot: data.supplierNameSnapshot,
      },
      include: { contract: true, type: true, supplier: true },
    });
    return this.formatTicket(ticket);
  }

  /** Define o fluxo de atendimento (e opcionalmente o fornecedor). */
  async attend(
    user: AccessUser,
    id: string,
    data: { flowId: string; supplierId?: string | null; supplierNameSnapshot?: string | null },
  ) {
    this.assertStaff(user);
    const before = await this.assertTicketAccess(user, id);
    const flowId = data.flowId;
    const supplierId = data.supplierId ?? undefined;
    if (!flowId) {
      throw new AppError(400, "Fluxo é obrigatório.");
    }
    if ((await prisma.ticketFlow.count({ where: { id: flowId } })) === 0) {
      throw new AppError(400, "Fluxo não encontrado.");
    }
    if (supplierId && (await prisma.registeredSupplier.count({ where: { id: supplierId } })) === 0) {
      throw new AppError(400, "Fornecedor não encontrado.");
    }
    const ticket = await prisma.serviceTicket.update({
      where: { id },
      data: {
        status: "fluxo_definido",
        flowId,
        supplierId,
        supplierNameSnapshot: data.supplierNameSnapshot ?? undefined,
      },
      include: { contract: true, type: true, supplier: true },
    });
    await this.notifyIfTicketChanged(before, ticket);
    return this.formatTicket(ticket);
  }

  async startAttention(user: AccessUser, id: string) {
    this.assertStaff(user);
    const before = await this.assertTicketAccess(user, id);
    const ticket = await prisma.serviceTicket.update({
      where: { id },
      data: { status: "em_atendimento" },
      include: { contract: true, type: true, supplier: true },
    });
    await this.notifyIfTicketChanged(before, ticket);
    return this.formatTicket(ticket);
  }

  async deleteTicket(user: AccessUser, id: string) {
    this.assertSuperAdmin(user);
    await this.assertTicketAccess(user, id);
    await prisma.serviceTicket.delete({ where: { id } });
    return { id };
  }

  // ─── Tipos e Fluxos ─────────────────────────────────────────────────────────
  async listTypes() {
    return prisma.ticketType.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  }

  async listFlows() {
    return prisma.ticketFlow.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  }

  // ─── Etapas (Steps) ─────────────────────────────────────────────────────────
  /** Etapa dentro do escopo do usuário (pelo contrato do chamado dela). */
  private async findStep(user: AccessUser, stepId: string) {
    const step = await prisma.ticketStep.findFirst({
      where: { id: stepId, ticket: this.ticketScope(user) },
    });
    if (!step) throw new AppError(404, "Etapa não encontrada.");
    return step;
  }

  async addStep(user: AccessUser, ticketId: string, title: string) {
    this.assertStaff(user);
    await this.assertTicketAccess(user, ticketId);
    const count = await prisma.ticketStep.count({ where: { ticketId } });
    const step = await prisma.ticketStep.create({
      data: {
        ticketId,
        title,
        order: count + 1,
      },
    });
    return step;
  }

  /** `desired` é o valor que o front envia (is_completed); sem ele, inverte o estado atual. */
  async toggleStep(user: AccessUser, stepId: string, desired?: boolean) {
    this.assertStaff(user);
    const step = await this.findStep(user, stepId);

    const completed = typeof desired === "boolean" ? desired : !step.completed;
    // Reenviar o mesmo estado não muda nada (nem troca quem concluiu)
    if (completed === step.completed) {
      return step;
    }

    const updated = await prisma.ticketStep.update({
      where: { id: stepId },
      data: {
        completed,
        completedAt: completed ? new Date() : null,
        completedBy: completed ? user.userId : null,
      },
    });

    if (completed) {
      await notificationService.ticketStepCompleted({ ticketId: step.ticketId, stepTitle: step.title });

      // Última etapa concluída fecha o chamado. A condição vai no próprio UPDATE: se duas pessoas
      // concluírem etapas ao mesmo tempo, só uma gravação acontece e só ela notifica.
      const closed = await prisma.serviceTicket.updateMany({
        where: { id: step.ticketId, status: { not: "concluido" }, steps: { none: { completed: false } } },
        data: { status: "concluido", resolvedAt: new Date() },
      });
      if (closed.count === 1) {
        const ticket = await prisma.serviceTicket.findUniqueOrThrow({
          where: { id: step.ticketId },
          select: { id: true, title: true, createdById: true, status: true, flowId: true },
        });
        await notificationService.ticketStatusChanged({
          ticketId: ticket.id,
          title: ticket.title,
          creatorId: ticket.createdById,
          status: ticket.status,
        });
      }
    }

    return updated;
  }

  async deleteStep(user: AccessUser, stepId: string) {
    this.assertStaff(user);
    await this.findStep(user, stepId);
    await prisma.ticketStep.delete({ where: { id: stepId } });
    return { stepId };
  }

  // ─── Mensagens / Chat ───────────────────────────────────────────────────────
  async getMessages(user: AccessUser, ticketId: string) {
    await this.assertTicketAccess(user, ticketId);
    const messages = await prisma.ticketMessage.findMany({
      where: { ticketId, ...(accessService.isSuprimentos(user) ? {} : { isInternal: false }) },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return messages;
  }

  async addMessage(user: AccessUser, ticketId: string, message: string, isInternal = false) {
    await this.assertTicketAccess(user, ticketId);
    if (isInternal && !accessService.isSuprimentos(user)) {
      throw new AppError(403, "Somente suprimentos ou administradores podem escrever mensagens internas.");
    }
    const userId = user.userId;
    const msg = await prisma.ticketMessage.create({
      data: {
        ticketId,
        userId,
        message,
        isInternal,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
      },
    });

    await notificationService.ticketMessageCreated({ ticketId, authorId: userId, message, isInternal });

    return msg;
  }

  async deleteMessage(user: AccessUser, messageId: string) {
    this.assertSuperAdmin(user);
    const msg = await prisma.ticketMessage.findFirst({ where: { id: messageId, ticket: this.ticketScope(user) } });
    if (!msg) throw new AppError(404, "Mensagem não encontrada.");
    await prisma.ticketMessage.delete({ where: { id: messageId } });
    return { messageId };
  }

  // ─── Anexos ─────────────────────────────────────────────────────────────────
  async getAttachments(user: AccessUser, ticketId: string) {
    await this.assertTicketAccess(user, ticketId);
    return prisma.ticketAttachment.findMany({
      where: { ticketId },
      orderBy: { createdAt: "desc" },
    });
  }

  async addAttachment(
    user: AccessUser,
    ticketId: string,
    data: { fileName: string; fileUrl: string; fileType?: string; fileSize?: number },
  ) {
    await this.assertTicketAccess(user, ticketId);
    return prisma.ticketAttachment.create({
      data: {
        ticketId,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileSize: data.fileSize,
        uploadedBy: user.userId,
      },
    });
  }

  async deleteAttachment(user: AccessUser, attachmentId: string) {
    const attachment = await prisma.ticketAttachment.findFirst({
      where: { id: attachmentId, ticket: this.ticketScope(user) },
    });
    if (!attachment) throw new AppError(404, "Anexo não encontrado.");
    if (attachment.uploadedBy !== user.userId && !accessService.isSuprimentos(user)) {
      throw new AppError(403, "Só quem enviou o anexo, suprimentos ou administradores podem apagá-lo.");
    }
    await prisma.ticketAttachment.delete({ where: { id: attachmentId } });
    return { attachmentId };
  }

  // ─── Produtos / Custos vinculados ao Chamado ────────────────────────────────
  async getProducts(user: AccessUser, ticketId: string) {
    await this.assertTicketAccess(user, ticketId);
    const items = await prisma.ticketProduct.findMany({
      where: { ticketId },
      include: { product: { select: { name: true, codigo: true, unidade: true } } },
      orderBy: { createdAt: "asc" },
    });
    return items.map((p) => this.formatProduct(p));
  }

  /**
   * Recalcula o custo final a partir dos produtos, quando o chamado está com sincronização automática.
   * A soma é feita no próprio UPDATE: duas inclusões ao mesmo tempo não se perdem.
   */
  private async syncFinalCost(ticketId: string) {
    await prisma.$executeRaw`
      UPDATE service_tickets
      SET final_cost = (SELECT COALESCE(SUM(unit_price * quantity), 0) FROM ticket_products WHERE ticket_id = ${ticketId})
      WHERE id = ${ticketId} AND auto_sync_cost
    `;
  }

  async addProduct(
    user: AccessUser,
    ticketId: string,
    data: { productId?: string | null; productNameSnapshot?: string | null; quantity: number; unitPrice?: number | null; notes?: string | null },
  ) {
    await this.assertTicketAccess(user, ticketId);

    const productId = data.productId || undefined;
    let unitPrice = data.unitPrice ?? 0;
    let productNameSnapshot = data.productNameSnapshot ?? "";

    if (productId) {
      const prod = await prisma.product.findUnique({ where: { id: productId } });
      if (!prod) {
        throw new AppError(400, "Produto não encontrado.");
      }
      productNameSnapshot = prod.name;
      if (!unitPrice) unitPrice = Number(prod.tabela);
    }

    const item = await prisma.ticketProduct.create({
      data: {
        ticketId,
        productId,
        productNameSnapshot,
        quantity: data.quantity,
        unitPrice,
        notes: data.notes ?? undefined,
      },
      include: { product: { select: { name: true, codigo: true, unidade: true } } },
    });
    await this.syncFinalCost(ticketId);

    return this.formatProduct(item);
  }

  async deleteProduct(user: AccessUser, productId: string) {
    const item = await prisma.ticketProduct.findFirst({ where: { id: productId, ticket: this.ticketScope(user) } });
    if (!item) throw new AppError(404, "Produto do chamado não encontrado.");
    await prisma.ticketProduct.delete({ where: { id: productId } });
    await this.syncFinalCost(item.ticketId);
    return { productId };
  }

  // Produto do chamado: o modelo mais o código/unidade do produto e o total da linha (calculados)
  private formatProduct(p: any) {
    const unitPrice = Number(p.unitPrice);
    return {
      ...p,
      productNameSnapshot: p.productNameSnapshot || p.product?.name || "",
      productCodeSnapshot: p.product?.codigo ?? "",
      productUnitSnapshot: p.product?.unidade ?? null,
      totalPrice: Math.round(unitPrice * p.quantity * 100) / 100,
    };
  }

  // ─── Helper de Formatação ───────────────────────────────────────────────────
  // Chamado: o modelo (com relações) mais `counts` (quantos filhos de cada tipo) e os produtos formatados
  private formatTicket(t: any) {
    const { _count, ...ticket } = t;
    return {
      ...ticket,
      products: (t.products || []).map((p: any) => this.formatProduct(p)),
      counts: _count,
    };
  }
}

export const ticketService = new TicketService();
