import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error.middleware.js";
import type { Contract, OrderStatus, Prisma } from "@prisma/client";
import { auditService } from "./audit.service.js";
import { accessService, type AccessUser } from "./access.service.js";

export class OrderService {
  /**
   * Valida e prepara os itens de um pedido (regras da antiga função create_order_with_items):
   * - linhas repetidas do mesmo produto são somadas
   * - o produto precisa existir, estar ativo e ser da regional do contrato (ou ser global, sem regional)
   * - o preço vem do produto; o preço enviado pelo cliente só vale se o contrato permitir preços personalizados
   */
  private async prepareItems(
    contract: { regionalId: string; allowCustomPrices: boolean },
    items: Array<{ productId?: string; product_id?: string; quantity: number; unitPrice?: number; unit_price?: number }>,
  ) {
    const wanted = new Map<string, { quantity: number; customPrice?: number }>();
    for (const it of items) {
      const productId = it?.productId || it?.product_id;
      if (typeof productId !== "string" || !Number.isInteger(it.quantity) || it.quantity <= 0) {
        throw new AppError(400, "Os itens informados são inválidos.");
      }
      const sent = it.unitPrice ?? it.unit_price;
      if (sent !== undefined && sent !== null && (typeof sent !== "number" || !Number.isFinite(sent) || sent < 0)) {
        throw new AppError(400, "Os itens informados são inválidos.");
      }
      const current = wanted.get(productId);
      wanted.set(productId, {
        quantity: (current?.quantity ?? 0) + it.quantity,
        customPrice: sent == null ? current?.customPrice : Math.max(current?.customPrice ?? 0, sent),
      });
    }
    if (wanted.size === 0) {
      throw new AppError(400, "O pedido precisa conter ao menos um item.");
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: [...wanted.keys()] },
        active: true,
        OR: [{ regionalId: contract.regionalId }, { regionalId: null }],
      },
      include: { category: true, supplier: true },
    });
    const productById = new Map(products.map((p) => [p.id, p]));

    const unavailable = [...wanted.keys()].filter((id) => !productById.has(id));
    if (unavailable.length > 0) {
      const shown = unavailable.slice(0, 5).join("; ");
      const more = unavailable.length > 5 ? ` e mais ${unavailable.length - 5} item(ns)` : "";
      throw new AppError(400, `Produtos indisponíveis para este contrato: ${shown}${more}. Ajuste os itens antes de enviar o pedido.`);
    }

    let totalAmount = 0;
    const itemsToCreate: Prisma.OrderItemCreateManyOrderInput[] = [];
    for (const [productId, wantedItem] of wanted) {
      const prod = productById.get(productId)!;
      const unitPrice =
        contract.allowCustomPrices && wantedItem.customPrice !== undefined ? wantedItem.customPrice : Number(prod.tabela);

      totalAmount += unitPrice * wantedItem.quantity;
      itemsToCreate.push({
        productId,
        quantity: wantedItem.quantity,
        unitPrice,
        productNameSnapshot: prod.name,
        productCodigoSnapshot: prod.codigo,
        productUnidadeSnapshot: prod.unidade,
        productCategoriaSnapshot: prod.category?.name,
        productFornecedorSnapshot: prod.supplier?.tradeName || prod.supplier?.name,
        productTabelaSnapshot: prod.tabela,
        productImageUrlSnapshot: prod.imageUrl,
      });
    }

    return { itemsToCreate, totalAmount: Math.round(totalAmount * 100) / 100 };
  }

  /**
   * Contrato com orçamento bloqueado não pode passar do saldo do mês (consumo + valor do pedido
   * acima do limite). Contratos de orçamento ilimitado não são verificados, inclusive na edição
   * de itens (no Supabase a edição ignorava esse flag; aqui é de propósito).
   *
   * Premissa: o consumo só é debitado na aprovação (updateStatus), então esta checagem é um
   * aviso antecipado. Dois pedidos simultâneos podem passar por ela, como já acontecia no Supabase.
   */
  private async assertBudgetAllows(
    contract: Pick<Contract, "id" | "unlimitedBudget" | "budgetLocked" | "totalBudget">,
    ano: number,
    mes: number,
    orderTotal: number,
    message: string,
  ) {
    if (contract.unlimitedBudget) return;

    const period = await prisma.contractBudgetPeriod.findUnique({
      where: { contractId_periodMonth: { contractId: contract.id, periodMonth: `${ano}-${String(mes).padStart(2, "0")}` } },
    });

    // Sem período do mês, nada foi consumido ainda (contract.usedBudget acumula todos os meses)
    const locked = period?.budgetLocked ?? contract.budgetLocked;
    const used = period ? Number(period.usedBudget) : 0;
    const monthly = Number(period ? period.monthlyBudget : contract.totalBudget);

    if (locked && used + orderTotal > monthly) {
      throw new AppError(400, message);
    }
  }

  /**
   * Garante que o pedido existe e está no escopo do usuário (404 caso contrário).
   * O id pode vir do body, então precisa ser validado.
   */
  private async assertOrderAccess(user: AccessUser, orderId: string) {
    if (typeof orderId !== "string" || !orderId) {
      throw new AppError(400, "Pedido é obrigatório.");
    }
    const order = await prisma.order.findFirst({
      where: { id: orderId, contract: accessService.contractFilter(user) },
      select: { id: true },
    });
    if (!order) {
      throw new AppError(404, "Pedido não encontrado.");
    }
  }

  /**
   * Lista pedidos com filtros operacionais
   */
  async listOrders(
    user: AccessUser,
    params?: {
      regionalId?: string;
      contractId?: string;
      status?: string;
      competenceMonth?: string; // YYYY-MM
    },
  ) {
    // O escopo vai dentro de AND para o filtro de regional/contrato enviado pelo cliente
    // não sobrescrevê-lo (where.contract = ... mais abaixo).
    const where: any = { AND: [{ contract: accessService.contractFilter(user) }] };

    if (params?.status) {
      where.status = params.status as OrderStatus;
    }

    if (params?.contractId) {
      where.contractId = params.contractId;
    }

    if (params?.regionalId) {
      where.contract = { regionalId: params.regionalId };
    }

    if (params?.competenceMonth) {
      const [ano, mes] = params.competenceMonth.split("-").map(Number);
      if (ano && mes) {
        where.ano = ano;
        where.mes = mes;
      }
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        contract: {
          include: { regional: true, category: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return orders.map((o) => this.formatOrder(o));
  }

  /**
   * Lista pedidos do próprio usuário logado
   */
  async getMyOrders(user: AccessUser, month?: string) {
    const where: any = {
      createdById: user.userId,
      AND: [{ contract: accessService.contractFilter(user) }],
    };

    if (month) {
      const [ano, mes] = month.split("-").map(Number);
      if (ano && mes) {
        where.ano = ano;
        where.mes = mes;
      }
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        contract: {
          include: { regional: true, category: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return orders.map((o) => this.formatOrder(o));
  }

  /**
   * Pedidos do mês ativo acessíveis
   */
  async getActiveMonthOrders(user: AccessUser) {
    const now = new Date();
    const mes = now.getMonth() + 1;
    const ano = now.getFullYear();

    const where: any = { mes, ano, contract: accessService.contractFilter(user) };

    const orders = await prisma.order.findMany({
      where,
      include: {
        contract: {
          include: { regional: true, category: true },
        },
        items: true,
      },
    });

    return orders.map((o) => ({
      id: o.id,
      contract_id: o.contractId,
      contractId: o.contractId,
      contract_name: o.contract.name,
      contractName: o.contract.name,
      regional_name: o.contract.regional.name,
      regionalName: o.contract.regional.name,
      category_name: o.contract.category?.name || "Geral",
      categoryName: o.contract.category?.name || "Geral",
      status: o.status,
      total_amount: Number(o.totalAmount),
      totalAmount: Number(o.totalAmount),
      items_count: o.items.length,
      itemsCount: o.items.length,
      is_extra_order: o.isExtraOrder,
      isExtraOrder: o.isExtraOrder,
    }));
  }

  /**
   * Pedido ativo do mês atual para um contrato
   */
  async getCurrentMonthOrder(user: AccessUser, contractId: string) {
    // contractId vem da URL: sem essa checagem, um valor ausente ou malformado viraria "qualquer contrato"
    if (typeof contractId !== "string" || !contractId) {
      throw new AppError(400, "Contrato é obrigatório.");
    }

    const now = new Date();
    const mes = now.getMonth() + 1;
    const ano = now.getFullYear();

    const order = await prisma.order.findFirst({
      where: {
        contractId,
        mes,
        ano,
        isExtraOrder: false,
        contract: accessService.contractFilter(user),
      },
      include: {
        contract: {
          include: { regional: true, category: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        items: true,
      },
    });

    return order ? this.formatOrder(order) : null;
  }

  /**
   * Detalhes de um pedido por ID
   */
  async getOrderById(user: AccessUser, id: string) {
    const order = await prisma.order.findFirst({
      where: { id, contract: accessService.contractFilter(user) },
      include: {
        contract: {
          include: { regional: true, category: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: { product: true },
        },
        history: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) {
      throw new AppError(404, "Pedido não encontrado.");
    }

    return this.formatOrder(order);
  }

  /**
   * Criação de Pedido Mensal Regular
   */
  async createMonthlyOrder(
    user: AccessUser,
    data: {
      contract_id?: string;
      contractId?: string;
      mes?: number;
      ano?: number;
      notes?: string;
      items: Array<{
        product_id?: string;
        productId?: string;
        quantity: number;
        unit_price?: number;
        unitPrice?: number;
      }>;
    },
  ) {
    const contractId = data.contractId || data.contract_id;
    if (!contractId) {
      throw new AppError(400, "Contrato é obrigatório.");
    }

    const now = new Date();
    const mes = data.mes || now.getMonth() + 1;
    const ano = data.ano || now.getFullYear();

    const contract = await accessService.assertContractAccess(user, contractId);
    const userId = user.userId;

    const { itemsToCreate, totalAmount } = await this.prepareItems(contract, data.items);
    await this.assertBudgetAllows(
      contract,
      ano,
      mes,
      totalAmount,
      "Este contrato está com o orçamento bloqueado. Remova itens para ficar dentro do saldo disponível antes de enviar o pedido.",
    );

    const order = await prisma.order.create({
      data: {
        contractId,
        createdById: userId,
        status: "pendente",
        mes,
        ano,
        isExtraOrder: false,
        notes: data.notes,
        totalAmount,
        items: {
          create: itemsToCreate,
        },
        history: {
          create: {
            userId,
            action: "Criação do Pedido Mensal",
            details: `Pedido mensal criado com ${itemsToCreate.length} itens. Total: R$ ${totalAmount.toFixed(2)}`,
            newStatus: "pendente",
          },
        },
      },
      include: {
        contract: { include: { regional: true, category: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        items: true,
      },
    });

    return this.formatOrder(order);
  }

  /**
   * Criação de Pedido Extra
   */
  async createExtraOrder(
    user: AccessUser,
    data: {
      contract_id?: string;
      contractId?: string;
      mes?: number;
      ano?: number;
      notes?: string;
      justification?: string;
      items: Array<{
        product_id?: string;
        productId?: string;
        quantity: number;
        unit_price?: number;
        unitPrice?: number;
      }>;
    },
  ) {
    const contractId = data.contractId || data.contract_id;
    if (!contractId) {
      throw new AppError(400, "Contrato é obrigatório.");
    }

    const contract = await accessService.assertContractAccess(user, contractId);
    if (!contract.allowExtraOrder) {
      throw new AppError(400, "Este contrato não está habilitado para receber pedidos extras.");
    }
    const userId = user.userId;

    const now = new Date();
    const mes = data.mes || now.getMonth() + 1;
    const ano = data.ano || now.getFullYear();

    const { itemsToCreate, totalAmount } = await this.prepareItems(contract, data.items);
    await this.assertBudgetAllows(
      contract,
      ano,
      mes,
      totalAmount,
      "Este contrato está com o orçamento bloqueado. O pedido extra excede o saldo disponível da competência.",
    );

    const order = await prisma.order.create({
      data: {
        contractId,
        createdById: userId,
        status: "pendente",
        mes,
        ano,
        isExtraOrder: true,
        notes: data.notes || data.justification,
        totalAmount,
        items: {
          create: itemsToCreate,
        },
        history: {
          create: {
            userId,
            action: "Criação de Pedido Extra",
            details: `Pedido extra criado. Justificativa: ${data.notes || data.justification || "Não informada"}. Total: R$ ${totalAmount.toFixed(2)}`,
            newStatus: "pendente",
          },
        },
      },
      include: {
        contract: { include: { regional: true, category: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        items: true,
      },
    });

    return this.formatOrder(order);
  }

  /**
   * Atualização de status do pedido (Aprovar, Rejeitar, Entregar)
   */
  async updateStatus(
    user: AccessUser,
    orderId: string,
    data: {
      status: OrderStatus;
      notes?: string;
    },
  ) {
    const userId = user.userId;
    const order = await prisma.order.findFirst({
      where: { id: orderId, contract: accessService.contractFilter(user) },
      include: { contract: true },
    });

    if (!order) {
      throw new AppError(404, "Pedido não encontrado.");
    }

    const oldStatus = order.status;
    const newStatus = data.status;

    if (oldStatus === newStatus) {
      return {
        orderId,
        oldStatus,
        newStatus,
        order: this.formatOrder(order),
      };
    }

    // Transação atômica ACID: se qualquer etapa falhar, reverte todas
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Troca o status só se ele ainda for o que lemos. Sem isso, dois cliques simultâneos
      // aprovariam duas vezes e debitariam o orçamento duas vezes.
      const changed = await tx.order.updateMany({
        where: { id: orderId, status: oldStatus },
        data: { status: newStatus },
      });
      if (changed.count === 0) {
        throw new AppError(409, "O status do pedido foi alterado por outra pessoa. Atualize a página e tente de novo.");
      }

      // 2. Registra auditoria no histórico
      await tx.orderHistory.create({
        data: {
          orderId,
          userId,
          action: `Transição de Status: ${oldStatus} -> ${newStatus}`,
          details: data.notes || null,
          oldStatus,
          newStatus,
        },
      });

      const res = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: {
          contract: { include: { regional: true, category: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          items: true,
        },
      });

      const wasDebited = oldStatus === "aprovado" || oldStatus === "entregue";
      const willDebit = newStatus === "aprovado" || newStatus === "entregue";
      const periodMonth = `${order.ano}-${String(order.mes).padStart(2, "0")}`;

      // 2. Se o status migrou para aprovado/entregue (débito de orçamento)
      if (!wasDebited && willDebit) {
        await tx.contract.update({
          where: { id: order.contractId },
          data: {
            usedBudget: { increment: order.totalAmount },
          },
        });

        await tx.contractBudgetPeriod.upsert({
          where: {
            contractId_periodMonth: {
              contractId: order.contractId,
              periodMonth,
            },
          },
          create: {
            contractId: order.contractId,
            periodMonth,
            monthlyBudget: order.contract.totalBudget,
            usedBudget: order.totalAmount,
            budgetLocked: order.contract.budgetLocked,
          },
          update: {
            usedBudget: { increment: order.totalAmount },
          },
        });
      }
      // 3. Se o pedido foi cancelado/rejeitado após ter sido aprovado (estorno do orçamento)
      else if (wasDebited && !willDebit) {
        await tx.contract.update({
          where: { id: order.contractId },
          data: {
            usedBudget: { decrement: order.totalAmount },
          },
        });

        await tx.contractBudgetPeriod.updateMany({
          where: {
            contractId: order.contractId,
            periodMonth,
          },
          data: {
            usedBudget: { decrement: order.totalAmount },
          },
        });
      }

      return res;
    });

    // Trilha de auditoria global (LGPD / SOX)
    void auditService.log({
      userId,
      action: newStatus === "aprovado" ? "APPROVE" : newStatus === "rejeitado" ? "REJECT" : newStatus === "cancelado" ? "CANCEL" : "UPDATE",
      entity: "Order",
      entityId: orderId,
      details: `Status alterado de "${oldStatus}" para "${newStatus}"${data.notes ? ` (${data.notes})` : ""}`,
      diffBefore: { status: oldStatus },
      diffAfter: { status: newStatus },
    });

    return {
      orderId,
      oldStatus,
      newStatus,
      order: this.formatOrder(updated),
    };
  }

  /**
   * Consulta em lote itens de pedidos
   */
  async queryItems(user: AccessUser, orderIds: string[]) {
    if (!Array.isArray(orderIds)) {
      throw new AppError(400, "orderIds deve ser uma lista de ids.");
    }
    const items = await prisma.orderItem.findMany({
      where: {
        orderId: { in: orderIds },
        order: { contract: accessService.contractFilter(user) },
      },
      include: { product: true },
    });

    return items.map((it) => ({
      id: it.id,
      order_id: it.orderId,
      orderId: it.orderId,
      product_id: it.productId,
      productId: it.productId,
      quantity: it.quantity,
      unit_price: Number(it.unitPrice),
      unitPrice: Number(it.unitPrice),
      total: Number(it.unitPrice) * it.quantity,
      product_name_snapshot: it.productNameSnapshot,
      productNameSnapshot: it.productNameSnapshot,
      product_codigo_snapshot: it.productCodigoSnapshot,
      productCodeSnapshot: it.productCodigoSnapshot,
      product_unidade_snapshot: it.productUnidadeSnapshot,
      productUnitSnapshot: it.productUnidadeSnapshot,
      product_categoria_snapshot: it.productCategoriaSnapshot,
      categoryNameSnapshot: it.productCategoriaSnapshot,
      product_fornecedor_snapshot: it.productFornecedorSnapshot,
      product_image_url_snapshot: it.productImageUrlSnapshot,
      product: it.product
        ? {
            id: it.product.id,
            name: it.product.name,
            codigo: it.product.codigo || "",
            unidade: it.product.unidade,
            categoria: it.productCategoriaSnapshot || "Geral",
            tabela: Number(it.product.tabela),
            valor_unitario: Number(it.product.tabela),
            image_url: it.product.imageUrl,
            fornecedor: it.productFornecedorSnapshot || null,
          }
        : null,
    }));
  }

  /**
   * Atualização de itens de um pedido
   */
  async updateItems(
    user: AccessUser,
    orderId: string,
    items: Array<{ product_id: string; quantity: number; unit_price: number }>,
  ) {
    if (!accessService.isSuprimentos(user)) {
      throw new AppError(403, "Apenas usuários de suprimentos ou administradores podem editar os itens do pedido.");
    }
    // Lista vazia apagaria todos os itens do pedido (prepareItems valida o conteúdo de cada item)
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError(400, "O pedido precisa conter ao menos um item.");
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, contract: accessService.contractFilter(user) },
      select: { id: true, status: true, ano: true, mes: true, contract: true },
    });
    if (!order) {
      throw new AppError(404, "Pedido não encontrado.");
    }
    if (order.status !== "pendente") {
      throw new AppError(400, "Apenas pedidos pendentes podem ter itens editados.");
    }

    const { itemsToCreate, totalAmount: newTotal } = await this.prepareItems(order.contract, items);
    await this.assertBudgetAllows(
      order.contract,
      order.ano,
      order.mes,
      newTotal,
      "Este contrato está com o orçamento bloqueado. Remova itens para ficar dentro do saldo disponível antes de salvar as alterações.",
    );

    // Remove os itens antigos e recria: tudo junto, para não perder os itens se algo falhar.
    // O pedido só é atualizado se ainda estiver pendente (uma aprovação simultânea faria o
    // débito do orçamento usar o total antigo).
    await prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({
        where: { id: orderId, status: "pendente" },
        data: { totalAmount: newTotal },
      });
      if (updated.count === 0) {
        throw new AppError(409, "O pedido deixou de estar pendente. Atualize a página e tente de novo.");
      }
      await tx.orderItem.deleteMany({ where: { orderId } });
      await tx.orderItem.createMany({ data: itemsToCreate.map((item) => ({ ...item, orderId })) });
    });

    return { orderId, newTotal };
  }

  /**
   * Histórico de auditoria do pedido
   */
  async getOrderHistory(user: AccessUser, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, contract: accessService.contractFilter(user) },
      select: { id: true },
    });
    if (!order) {
      throw new AppError(404, "Pedido não encontrado.");
    }

    const history = await prisma.orderHistory.findMany({
      where: { orderId },
      orderBy: { createdAt: "desc" },
    });

    return history.map((h) => ({
      id: h.id,
      order_id: h.orderId,
      orderId: h.orderId,
      user_id: h.userId,
      userId: h.userId,
      action: h.action,
      details: h.details,
      created_at: h.createdAt.toISOString(),
      createdAt: h.createdAt.toISOString(),
    }));
  }

  async addHistory(user: AccessUser, orderId: string, data: { action: string; details?: string | null }) {
    await this.assertOrderAccess(user, orderId);
    if (typeof data?.action !== "string" || !data.action.trim()) {
      throw new AppError(400, "A ação do histórico é obrigatória.");
    }

    const userId = user.userId;
    const entry = await prisma.orderHistory.create({
      data: {
        orderId,
        userId,
        action: data.action,
        details: data.details,
      },
    });
    return {
      id: entry.id,
      order_id: entry.orderId,
      orderId: entry.orderId,
      action: entry.action,
      details: entry.details,
      created_at: entry.createdAt.toISOString(),
    };
  }

  /**
   * Exclusão de pedido
   */
  async deleteOrder(user: AccessUser, id: string) {
    const order = await prisma.order.findFirst({
      where: { id, contract: accessService.contractFilter(user) },
      select: { id: true, status: true, isExtraOrder: true },
    });
    if (!order) {
      throw new AppError(404, "Pedido não encontrado.");
    }

    // Regras herdadas do Supabase (cancelado vale como rejeitado):
    // - pedido extra: suprimentos ou admin, se estiver pendente, rejeitado ou cancelado
    // - pedido mensal: só admin, se estiver rejeitado ou cancelado
    const canDelete = order.isExtraOrder
      ? accessService.isSuprimentos(user) && ["pendente", "rejeitado", "cancelado"].includes(order.status)
      : accessService.isAdmin(user) && ["rejeitado", "cancelado"].includes(order.status);
    if (!canDelete) {
      throw new AppError(403, "Seu perfil não pode excluir este pedido neste status.");
    }

    // Só apaga se o status ainda for o que validamos (um pedido aprovado no meio do caminho
    // seria apagado sem estornar o orçamento)
    const deleted = await prisma.order.deleteMany({ where: { id, status: order.status } });
    if (deleted.count === 0) {
      throw new AppError(409, "O pedido foi alterado por outra pessoa. Atualize a página e tente de novo.");
    }
    return { orderId: id };
  }

  // ─── Divergências de Entrega ────────────────────────────────────────────────
  async listDeliveryDivergences(user: AccessUser, params?: { competenceMonth?: string }) {
    return prisma.orderDeliveryDivergence.findMany({
      where: { order: { contract: accessService.contractFilter(user) } },
      include: {
        order: { include: { contract: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createDeliveryDivergence(user: AccessUser, data: { orderId: string; description: string }) {
    await this.assertOrderAccess(user, data.orderId);
    if (typeof data.description !== "string" || !data.description.trim()) {
      throw new AppError(400, "A descrição da divergência é obrigatória.");
    }
    return prisma.orderDeliveryDivergence.create({
      data: {
        orderId: data.orderId,
        reportedById: user.userId,
        description: data.description,
      },
    });
  }

  async resolveDeliveryDivergence(user: AccessUser, id: string, notes?: string) {
    if (!accessService.isSuprimentos(user)) {
      throw new AppError(403, "Apenas usuários de suprimentos ou administradores podem resolver divergências.");
    }
    const divergence = await prisma.orderDeliveryDivergence.findFirst({
      where: { id, order: { contract: accessService.contractFilter(user) } },
      select: { id: true },
    });
    if (!divergence) {
      throw new AppError(404, "Divergência não encontrada.");
    }

    return prisma.orderDeliveryDivergence.update({
      where: { id },
      data: {
        status: "resolvida",
        notes,
        resolvedAt: new Date(),
      },
    });
  }

  // ─── Relatos de Problemas ───────────────────────────────────────────────────
  async listIssueReports(user: AccessUser) {
    return prisma.orderIssueReport.findMany({
      // Suprimentos e admin veem os relatos dos contratos que acessam; os demais, só os próprios
      where: {
        order: { contract: accessService.contractFilter(user) },
        ...(accessService.isSuprimentos(user) ? {} : { reportedById: user.userId }),
      },
      include: {
        order: { include: { contract: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createIssueReport(user: AccessUser, data: { orderId: string; description: string }) {
    await this.assertOrderAccess(user, data.orderId);
    if (typeof data.description !== "string" || !data.description.trim()) {
      throw new AppError(400, "A descrição do relato é obrigatória.");
    }
    return prisma.orderIssueReport.create({
      data: {
        orderId: data.orderId,
        reportedById: user.userId,
        description: data.description,
      },
    });
  }

  async updateIssueReportStatus(user: AccessUser, id: string, status: string, notes?: string) {
    if (!accessService.isSuprimentos(user)) {
      throw new AppError(403, "Apenas usuários de suprimentos ou administradores podem atualizar relatos.");
    }
    const report = await prisma.orderIssueReport.findFirst({
      where: { id, order: { contract: accessService.contractFilter(user) } },
      select: { id: true },
    });
    if (!report) {
      throw new AppError(404, "Relato não encontrado.");
    }
    if (typeof status !== "string" || !status.trim()) {
      throw new AppError(400, "O status do relato é obrigatório.");
    }

    return prisma.orderIssueReport.update({
      where: { id },
      data: {
        status,
        notes,
        resolvedAt: ["resolvido", "resolved"].includes(status) ? new Date() : undefined,
      },
    });
  }

  // ─── Helper de Formatação ───────────────────────────────────────────────────
  private formatOrder(o: any) {
    return {
      id: o.id,
      user_id: o.createdById,
      userId: o.createdById,
      userName: o.createdBy?.name,
      user_profile: o.createdBy ? { full_name: o.createdBy.name } : undefined,
      contract_id: o.contractId,
      contractId: o.contractId,
      contract: o.contract
        ? {
            id: o.contract.id,
            name: o.contract.name,
            regional_id: o.contract.regionalId,
            regional: o.contract.regional,
            category_id: o.contract.categoryId,
            category: o.contract.category,
            total_budget: Number(o.contract.totalBudget),
            used_budget: Number(o.contract.usedBudget),
            unlimited_budget: o.contract.unlimitedBudget,
            allow_extra_order: o.contract.allowExtraOrder,
            budget_locked: o.contract.budgetLocked,
          }
        : undefined,
      status: o.status,
      mes: o.mes,
      ano: o.ano,
      competenceMonth: `${o.ano}-${String(o.mes).padStart(2, "0")}`,
      is_extra_order: o.isExtraOrder,
      isExtraOrder: o.isExtraOrder,
      notes: o.notes,
      total_amount: Number(o.totalAmount),
      totalAmount: Number(o.totalAmount),
      created_at: o.createdAt.toISOString(),
      createdAt: o.createdAt.toISOString(),
      updated_at: o.updatedAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      items: o.items
        ? o.items.map((it: any) => ({
            id: it.id,
            order_id: it.orderId,
            orderId: it.orderId,
            product_id: it.productId,
            productId: it.productId,
            quantity: it.quantity,
            unit_price: Number(it.unitPrice),
            unitPrice: Number(it.unitPrice),
            total: Number(it.unitPrice) * it.quantity,
            product_name_snapshot: it.productNameSnapshot,
            productNameSnapshot: it.productNameSnapshot,
            product_codigo_snapshot: it.productCodigoSnapshot,
            productCodeSnapshot: it.productCodigoSnapshot,
            product_unidade_snapshot: it.productUnidadeSnapshot,
            productUnitSnapshot: it.productUnidadeSnapshot,
            product_categoria_snapshot: it.productCategoriaSnapshot,
            categoryNameSnapshot: it.productCategoriaSnapshot,
            product_fornecedor_snapshot: it.productFornecedorSnapshot,
            product_image_url_snapshot: it.productImageUrlSnapshot,
            product: it.product
              ? {
                  id: it.product.id,
                  name: it.product.name,
                  codigo: it.product.codigo || "",
                  unidade: it.product.unidade,
                  categoria: it.productCategoriaSnapshot || "Geral",
                  tabela: Number(it.product.tabela),
                  valor_unitario: Number(it.product.tabela),
                  image_url: it.product.imageUrl,
                  fornecedor: it.productFornecedorSnapshot || null,
                }
              : null,
          }))
        : [],
      history: o.history || [],
    };
  }
}

export const orderService = new OrderService();
