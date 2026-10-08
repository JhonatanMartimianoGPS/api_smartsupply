import { prisma } from "../lib/prisma.js";

interface NotificationInput {
  type: string;
  title: string;
  message: string;
  link?: string;
  ticketId?: string;
}

// Textos de status (os mesmos que os gatilhos do Supabase usavam)
const ORDER_STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const TICKET_STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto",
  em_atendimento: "Em Atendimento",
  fluxo_definido: "Fluxo Definido",
  aguardando_terceiro: "Aguardando Terceiro",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const SOLICITATION_STEP_LABEL: Record<string, string> = {
  aguardando_aprovacao_gestor: "Aguardando Aprovação do Gestor",
  aguardando_revisao_gestor: "Aguardando Revisão do Gestor",
  aguardando_compra_suprimentos: "Aguardando Compra (Suprimentos)",
  aguardando_finalizacao_suprimentos: "Aguardando Finalização (Suprimentos)",
};

function solicitationStatusLabel(status: string, step: string) {
  if (status === "concluido" || step === "concluido") return "Concluída";
  if (status === "rejeitado" || step === "rejeitado") return "Rejeitada";
  return SOLICITATION_STEP_LABEL[step] ?? "Em Andamento";
}

/**
 * Notificações do app (o sino). No Supabase eram gatilhos de banco; aqui cada serviço chama o método
 * do evento depois de gravar a ação principal.
 *
 * Regra de ouro: uma falha ao notificar NUNCA derruba a ação principal. Os métodos de evento nunca
 * lançam erro; só registram no log.
 */
export class NotificationService {
  // ─── Leitura (o que o sino mostra) ──────────────────────────────────────────
  async listNotifications(userId: string) {
    const list = await prisma.appNotification.findMany({
      where: { userId },
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    return list.map((n) => ({
      id: n.id,
      user_id: n.userId,
      ticket_id: n.ticketId,
      type: n.type,
      title: n.title,
      message: n.message,
      // O frontend lê link_url e read; link e is_read ficam por compatibilidade
      link_url: n.link,
      link: n.link,
      read: n.isRead,
      is_read: n.isRead,
      // Os contadores de mensagens por chamado do frontend leem metadata.ticket_id
      metadata: n.ticketId ? { ticket_id: n.ticketId } : null,
      created_at: n.createdAt.toISOString(),
    }));
  }

  async markAsRead(id: string, userId: string) {
    return prisma.appNotification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.appNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async markTicketNotificationsAsRead(ticketId: string, userId: string) {
    return prisma.appNotification.updateMany({
      where: { ticketId, userId },
      data: { isRead: true },
    });
  }

  async deleteNotification(id: string, userId: string) {
    await prisma.appNotification.deleteMany({
      where: { id, userId },
    });
    return { id };
  }

  async deleteAll(userId: string) {
    await prisma.appNotification.deleteMany({
      where: { userId },
    });
    return { success: true };
  }

  // ─── Destinatários ──────────────────────────────────────────────────────────

  /**
   * Quem acompanha a operação de uma regional: super_admin, e admin e suprimentos vinculados à regional.
   * Exclui quem fez a ação. (O Supabase também avisava admin e suprimentos sem regional nenhuma; hoje
   * eles não têm acesso a contrato algum, então o aviso só mostraria dados que eles não conseguem abrir.)
   */
  private async staffOfRegional(regionalId: string, excludeUserId?: string) {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        isBlocked: false,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
        OR: [
          { role: "super_admin" },
          { role: { in: ["admin", "suprimentos"] }, regionals: { some: { regionalId } } },
        ],
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  /** Gestores vinculados ao contrato e à regional dele (exclui quem fez a ação). */
  private async managersOfContract(contractId: string, regionalId: string, excludeUserId?: string) {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        isBlocked: false,
        role: "gestor",
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
        contracts: { some: { contractId } },
        regionals: { some: { regionalId } },
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  /** Cria o mesmo aviso para vários usuários. Nunca lança erro. */
  private async notifyUsers(userIds: string[], input: NotificationInput) {
    try {
      const unique = [...new Set(userIds)].filter(Boolean);
      if (unique.length === 0) return;
      await prisma.appNotification.createMany({ data: unique.map((userId) => ({ userId, ...input })) });
    } catch (error) {
      console.error("[notificações] falha ao criar o aviso:", error);
    }
  }

  /** Executa um evento garantindo que nenhum erro escape. */
  private async safely(eventName: string, action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      console.error(`[notificações] falha no evento ${eventName}:`, error);
    }
  }

  // ─── Pedidos ────────────────────────────────────────────────────────────────

  /** Pedido criado: avisa a equipe da regional e os gestores do contrato. */
  async orderCreated(params: {
    orderId: string;
    isExtra: boolean;
    contract: { id: string; name: string; regionalId: string };
    actorId: string;
  }) {
    await this.safely("orderCreated", async () => {
      const label = params.isExtra ? "Pedido Extra" : "Pedido Mensal";
      const message = `Um novo ${label} foi gerado no contrato ${params.contract.name}.`;
      const base = { type: "new_order", title: `Novo ${label}`, message };

      const [staff, managers] = await Promise.all([
        this.staffOfRegional(params.contract.regionalId, params.actorId),
        this.managersOfContract(params.contract.id, params.contract.regionalId, params.actorId),
      ]);
      await this.notifyUsers(staff, { ...base, link: `/acompanhamento-pedidos?openOrder=${params.orderId}` });
      await this.notifyUsers(managers, { ...base, link: `/?openOrder=${params.orderId}` });
    });
  }

  /** Status do pedido mudou: avisa quem criou o pedido. */
  async orderStatusChanged(params: {
    orderId: string;
    isExtra: boolean;
    contractName: string;
    creatorId: string;
    status: string;
  }) {
    await this.safely("orderStatusChanged", async () => {
      const prefix = params.isExtra ? "Pedido Extra" : "Pedido";
      await this.notifyUsers([params.creatorId], {
        type: "order_status_change",
        title: `Status do ${prefix} Atualizado`,
        message: `Seu ${prefix} no contrato ${params.contractName} foi atualizado para: ${ORDER_STATUS_LABEL[params.status] ?? params.status}.`,
        link: `/?openOrder=${params.orderId}`,
      });
    });
  }

  /** Divergência de entrega registrada: avisa a equipe da regional do contrato (menos quem registrou). */
  async deliveryDivergenceCreated(params: { orderId: string; reporterId: string }) {
    await this.safely("deliveryDivergenceCreated", async () => {
      const order = await prisma.order.findUnique({
        where: { id: params.orderId },
        select: { contract: { select: { name: true, regionalId: true } } },
      });
      if (!order) return;

      await this.notifyUsers(await this.staffOfRegional(order.contract.regionalId, params.reporterId), {
        type: "divergencia_entrega",
        title: "Divergência de Entrega",
        message: `Divergência de entrega registrada na conferência do pedido #${params.orderId.slice(0, 8)} (${order.contract.name}).`,
        link: `/suprimentos?tab=acompanhamento&filtro=divergencias&orderId=${params.orderId}`,
      });
    });
  }

  // ─── Solicitações ───────────────────────────────────────────────────────────

  /** Solicitação criada: avisa a equipe da regional e os gestores do contrato. */
  async solicitationCreated(params: {
    solicitationId: string;
    contract: { id: string; name: string; regionalId: string };
    actorId: string;
  }) {
    await this.safely("solicitationCreated", async () => {
      const base = {
        type: "new_solicitation",
        title: "Nova Solicitação Especial",
        message: `Uma nova solicitação especial foi aberta no contrato ${params.contract.name}.`,
      };
      const [staff, managers] = await Promise.all([
        this.staffOfRegional(params.contract.regionalId, params.actorId),
        this.managersOfContract(params.contract.id, params.contract.regionalId, params.actorId),
      ]);
      await this.notifyUsers(staff, { ...base, link: `/acompanhamento-pedidos?tab=solicitacoes&openSolicitation=${params.solicitationId}` });
      await this.notifyUsers(managers, { ...base, link: `/?openSolicitation=${params.solicitationId}` });
    });
  }

  /** Status ou etapa da solicitação mudou: avisa quem criou. */
  async solicitationStatusChanged(params: {
    solicitationId: string;
    contractName: string;
    creatorId: string;
    status: string;
    step: string;
  }) {
    await this.safely("solicitationStatusChanged", async () => {
      await this.notifyUsers([params.creatorId], {
        type: "solicitation_status_change",
        title: "Solicitação Especial Atualizada",
        message: `Sua solicitação especial no contrato ${params.contractName} teve o status atualizado para: ${solicitationStatusLabel(params.status, params.step)}.`,
        link: `/?openSolicitation=${params.solicitationId}`,
      });
    });
  }

  // ─── Chamados ───────────────────────────────────────────────────────────────

  /** Chamado criado: avisa a equipe da regional. */
  async ticketCreated(params: {
    ticketId: string;
    title: string;
    contractName: string | null;
    regionalId: string;
    actorId: string;
  }) {
    await this.safely("ticketCreated", async () => {
      await this.notifyUsers(await this.staffOfRegional(params.regionalId, params.actorId), {
        type: "new_ticket",
        title: "Novo Chamado de Serviço",
        message: `Novo chamado registrado: ${params.title || "Sem título"}${params.contractName ? ` (${params.contractName})` : ""}.`,
        link: `/chamados?openTicket=${params.ticketId}`,
        ticketId: params.ticketId,
      });
    });
  }

  /**
   * Mensagem no chamado: se foi o autor do chamado, avisa a equipe; se foi a equipe, avisa o autor.
   * Mensagem interna (só da equipe) não avisa o autor do chamado.
   */
  async ticketMessageCreated(params: { ticketId: string; authorId: string; message: string; isInternal: boolean }) {
    await this.safely("ticketMessageCreated", async () => {
      if (params.isInternal) return;
      const ticket = await prisma.serviceTicket.findUnique({
        where: { id: params.ticketId },
        select: { createdById: true, title: true, regionalId: true },
      });
      if (!ticket) return;

      const preview = params.message.length > 60 ? `${params.message.slice(0, 60)}...` : params.message;
      const link = `/chamados?openTicket=${params.ticketId}`;

      if (params.authorId === ticket.createdById) {
        await this.notifyUsers(await this.staffOfRegional(ticket.regionalId, params.authorId), {
          type: "ticket_chat_message",
          title: "Nova Mensagem em Chamado",
          message: `Nova resposta no chamado "${ticket.title}": "${preview}"`,
          link,
          ticketId: params.ticketId,
        });
      } else {
        await this.notifyUsers([ticket.createdById], {
          type: "ticket_chat_message",
          title: "Resposta no seu Chamado",
          message: `Seu chamado "${ticket.title}" recebeu uma nova resposta: "${preview}"`,
          link,
          ticketId: params.ticketId,
        });
      }
    });
  }

  /** Status ou fluxo do chamado mudou: avisa quem abriu o chamado. */
  async ticketStatusChanged(params: { ticketId: string; title: string; creatorId: string; status: string }) {
    await this.safely("ticketStatusChanged", async () => {
      await this.notifyUsers([params.creatorId], {
        type: "ticket_status_change",
        title: "Status do Chamado Atualizado",
        message: `O status do seu chamado "${params.title}" foi atualizado para: ${TICKET_STATUS_LABEL[params.status] ?? params.status}.`,
        link: `/chamados?openTicket=${params.ticketId}`,
        ticketId: params.ticketId,
      });
    });
  }

  /** Etapa do chamado concluída: avisa quem abriu o chamado. */
  async ticketStepCompleted(params: { ticketId: string; stepTitle: string }) {
    await this.safely("ticketStepCompleted", async () => {
      const ticket = await prisma.serviceTicket.findUnique({
        where: { id: params.ticketId },
        select: { createdById: true, title: true },
      });
      if (!ticket) return;

      await this.notifyUsers([ticket.createdById], {
        type: "ticket_status_change",
        title: "Etapa do Chamado Concluída",
        message: `A etapa "${params.stepTitle}" foi concluída no chamado "${ticket.title}".`,
        link: `/chamados?openTicket=${params.ticketId}`,
        ticketId: params.ticketId,
      });
    });
  }

  // ─── Mural ──────────────────────────────────────────────────────────────────

  /** Publicação no mural: avisa todos os usuários ativos (o post não tem regional). */
  async feedPostCreated(params: { postId: string; authorId: string }) {
    await this.safely("feedPostCreated", async () => {
      const users = await prisma.user.findMany({
        where: { isActive: true, isBlocked: false, id: { not: params.authorId } },
        select: { id: true },
      });
      await this.notifyUsers(
        users.map((u) => u.id),
        {
          type: "new_feed_post",
          title: "Novo Comunicado no Feed",
          message: "Um novo comunicado foi publicado no Feed de Comunicação.",
          link: `/feed?openPost=${params.postId}`,
        },
      );
    });
  }
}

export const notificationService = new NotificationService();
