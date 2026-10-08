import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error.middleware.js";
import { notificationService } from "./notification.service.js";
import type { TicketPriority, TicketStatus } from "@prisma/client";

export class TicketService {
  async listTickets(params?: {
    contractId?: string;
    regionalId?: string;
    status?: string;
    priority?: string;
  }) {
    const where: any = {};
    if (params?.contractId) where.contractId = params.contractId;
    if (params?.regionalId) where.regionalId = params.regionalId;
    if (params?.status) where.status = params.status as TicketStatus;
    if (params?.priority) where.priority = params.priority as TicketPriority;

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
        _count: { select: { messages: true, steps: true, attachments: true, products: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return tickets.map((t) => this.formatTicket(t));
  }

  async getTicketById(id: string) {
    const t = await prisma.serviceTicket.findUnique({
      where: { id },
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
          include: { user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } } },
          orderBy: { createdAt: "asc" },
        },
        attachments: true,
        products: { include: { product: true } },
      },
    });

    if (!t) {
      throw new AppError(404, "Chamado não encontrado.");
    }

    return this.formatTicket(t);
  }

  async createTicket(
    userId: string,
    data: {
      contract_id?: string;
      contractId?: string;
      title: string;
      description: string;
      priority?: TicketPriority;
      ticket_type_id?: string | null;
      ticketTypeId?: string | null;
    },
  ) {
    const contractId = data.contractId || data.contract_id;
    if (!contractId) {
      throw new AppError(400, "Contrato é obrigatório.");
    }

    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) {
      throw new AppError(404, "Contrato não encontrado.");
    }

    const typeId = data.ticketTypeId || data.ticket_type_id;
    let slaHours = 48;
    if (typeId) {
      const type = await prisma.ticketType.findUnique({ where: { id: typeId } });
      if (type) slaHours = type.slaHours;
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

  /** Avisa quem abriu o chamado quando o status ou o fluxo mudou (o que os três métodos abaixo fazem). */
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

  async updateStatus(id: string, status: TicketStatus) {
    const before = await prisma.serviceTicket.findUnique({ where: { id }, select: { status: true, flowId: true } });
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

  async updatePriority(id: string, priority: TicketPriority) {
    const ticket = await prisma.serviceTicket.update({
      where: { id },
      data: { priority },
      include: { contract: true, type: true, supplier: true },
    });
    return this.formatTicket(ticket);
  }

  async updateCost(id: string, data: { final_cost?: number; auto_sync_cost?: boolean }) {
    const ticket = await prisma.serviceTicket.update({
      where: { id },
      data: {
        finalCost: data.final_cost,
        autoSyncCost: data.auto_sync_cost,
      },
      include: { contract: true, type: true, supplier: true },
    });
    return this.formatTicket(ticket);
  }

  async updateSupplier(id: string, data: { supplier_id: string | null; supplier_name_snapshot?: string | null }) {
    const ticket = await prisma.serviceTicket.update({
      where: { id },
      data: {
        supplierId: data.supplier_id,
        supplierNameSnapshot: data.supplier_name_snapshot,
      },
      include: { contract: true, type: true, supplier: true },
    });
    return this.formatTicket(ticket);
  }

  async attend(id: string, data: { flowId?: string; supplierId?: string }) {
    const before = await prisma.serviceTicket.findUnique({ where: { id }, select: { status: true, flowId: true } });
    const ticket = await prisma.serviceTicket.update({
      where: { id },
      data: {
        status: "fluxo_definido",
        flowId: data.flowId,
        supplierId: data.supplierId,
      },
      include: { contract: true, type: true, supplier: true },
    });
    await this.notifyIfTicketChanged(before, ticket);
    return this.formatTicket(ticket);
  }

  async startAttention(id: string) {
    const before = await prisma.serviceTicket.findUnique({ where: { id }, select: { status: true, flowId: true } });
    const ticket = await prisma.serviceTicket.update({
      where: { id },
      data: { status: "em_atendimento" },
      include: { contract: true, type: true, supplier: true },
    });
    await this.notifyIfTicketChanged(before, ticket);
    return this.formatTicket(ticket);
  }

  async deleteTicket(id: string) {
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
  async addStep(ticketId: string, title: string) {
    const count = await prisma.ticketStep.count({ where: { ticketId } });
    return prisma.ticketStep.create({
      data: {
        ticketId,
        title,
        order: count + 1,
      },
    });
  }

  async toggleStep(stepId: string) {
    const step = await prisma.ticketStep.findUnique({ where: { id: stepId } });
    if (!step) throw new AppError(404, "Etapa não encontrada.");

    const completed = !step.completed;
    const updated = await prisma.ticketStep.update({
      where: { id: stepId },
      data: {
        completed,
        completedAt: completed ? new Date() : null,
      },
    });

    if (completed) {
      await notificationService.ticketStepCompleted({ ticketId: step.ticketId, stepTitle: step.title });
    }

    // Se todas as etapas foram concluídas, conclui o chamado
    const remaining = await prisma.ticketStep.count({
      where: { ticketId: step.ticketId, completed: false },
    });
    if (remaining === 0) {
      const before = await prisma.serviceTicket.findUnique({ where: { id: step.ticketId }, select: { status: true, flowId: true } });
      const ticket = await prisma.serviceTicket.update({
        where: { id: step.ticketId },
        data: { status: "concluido", resolvedAt: new Date() },
      });
      await this.notifyIfTicketChanged(before, ticket);
    }

    return updated;
  }

  async deleteStep(stepId: string) {
    await prisma.ticketStep.delete({ where: { id: stepId } });
    return { stepId };
  }

  // ─── Mensagens / Chat ───────────────────────────────────────────────────────
  async getMessages(ticketId: string) {
    const messages = await prisma.ticketMessage.findMany({
      where: { ticketId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return messages.map((m) => ({
      id: m.id,
      ticket_id: m.ticketId,
      user_id: m.userId,
      message: m.message,
      is_internal: m.isInternal,
      created_at: m.createdAt.toISOString(),
      user: m.user,
    }));
  }

  async addMessage(ticketId: string, userId: string, message: string, isInternal = false) {
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

    return {
      id: msg.id,
      ticket_id: msg.ticketId,
      user_id: msg.userId,
      message: msg.message,
      is_internal: msg.isInternal,
      created_at: msg.createdAt.toISOString(),
      user: msg.user,
    };
  }

  async deleteMessage(messageId: string) {
    await prisma.ticketMessage.delete({ where: { id: messageId } });
    return { messageId };
  }

  // ─── Anexos ─────────────────────────────────────────────────────────────────
  async getAttachments(ticketId: string) {
    return prisma.ticketAttachment.findMany({
      where: { ticketId },
      orderBy: { createdAt: "desc" },
    });
  }

  async addAttachment(
    ticketId: string,
    data: { fileName: string; fileUrl: string; fileType?: string; fileSize?: number; uploadedBy?: string },
  ) {
    return prisma.ticketAttachment.create({
      data: {
        ticketId,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileSize: data.fileSize,
        uploadedBy: data.uploadedBy,
      },
    });
  }

  async deleteAttachment(attachmentId: string) {
    await prisma.ticketAttachment.delete({ where: { id: attachmentId } });
    return { attachmentId };
  }

  // ─── Produtos / Custos vinculados ao Chamado ────────────────────────────────
  async getProducts(ticketId: string) {
    const items = await prisma.ticketProduct.findMany({
      where: { ticketId },
      include: { product: true },
    });

    return items.map((p) => ({
      id: p.id,
      ticket_id: p.ticketId,
      product_id: p.productId,
      product_name: p.productNameSnapshot || p.product?.name,
      quantity: p.quantity,
      unit_price: Number(p.unitPrice),
      total: Number(p.unitPrice) * p.quantity,
      notes: p.notes,
    }));
  }

  async addProduct(
    ticketId: string,
    data: { productId?: string; quantity: number; unitPrice?: number; notes?: string },
  ) {
    let productNameSnapshot = "";
    let unitPrice = data.unitPrice || 0;

    if (data.productId) {
      const prod = await prisma.product.findUnique({ where: { id: data.productId } });
      if (prod) {
        productNameSnapshot = prod.name;
        if (!unitPrice) unitPrice = Number(prod.tabela);
      }
    }

    const item = await prisma.ticketProduct.create({
      data: {
        ticketId,
        productId: data.productId,
        productNameSnapshot,
        quantity: data.quantity,
        unitPrice,
        notes: data.notes,
      },
    });

    // Se auto-sync de custos estiver ativado no ticket, atualiza o final_cost
    const ticket = await prisma.serviceTicket.findUnique({ where: { id: ticketId } });
    if (ticket?.autoSyncCost) {
      const all = await prisma.ticketProduct.findMany({ where: { ticketId } });
      const sum = all.reduce((acc, curr) => acc + Number(curr.unitPrice) * curr.quantity, 0);
      await prisma.serviceTicket.update({
        where: { id: ticketId },
        data: { finalCost: sum },
      });
    }

    return item;
  }

  async deleteProduct(productId: string) {
    await prisma.ticketProduct.delete({ where: { id: productId } });
    return { productId };
  }

  // ─── Helper de Formatação ───────────────────────────────────────────────────
  private formatTicket(t: any) {
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      contract_id: t.contractId,
      contractId: t.contractId,
      contract: t.contract,
      regional_id: t.regionalId,
      regionalId: t.regionalId,
      regional: t.regional,
      type_id: t.typeId,
      typeId: t.typeId,
      type: t.type,
      flow_id: t.flowId,
      flow: t.flow,
      supplier_id: t.supplierId,
      supplier: t.supplier,
      supplier_name_snapshot: t.supplierNameSnapshot,
      created_by_id: t.createdById,
      createdBy: t.createdBy,
      assigned_to_id: t.assignedToId,
      assignedTo: t.assignedTo,
      status: t.status,
      priority: t.priority,
      sla_hours: t.slaHours,
      final_cost: t.finalCost ? Number(t.finalCost) : null,
      auto_sync_cost: t.autoSyncCost,
      resolved_at: t.resolvedAt ? t.resolvedAt.toISOString() : null,
      created_at: t.createdAt.toISOString(),
      updated_at: t.updatedAt.toISOString(),
      steps: t.steps || [],
      messages: t.messages || [],
      attachments: t.attachments || [],
      products: t.products || [],
      counts: t._count,
    };
  }
}

export const ticketService = new TicketService();
