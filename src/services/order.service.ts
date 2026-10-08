import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error.middleware.js";
import type { OrderStatus } from "@prisma/client";
import { auditService } from "./audit.service.js";

export class OrderService {
  /**
   * Lista pedidos com filtros operacionais
   */
  async listOrders(params?: {
    regionalId?: string;
    contractId?: string;
    status?: string;
    competenceMonth?: string; // YYYY-MM
  }) {
    const where: any = {};

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
  async getMyOrders(userId: string, month?: string) {
    const where: any = { createdById: userId };

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
  async getActiveMonthOrders(userId: string, userRole: string) {
    const now = new Date();
    const mes = now.getMonth() + 1;
    const ano = now.getFullYear();

    const where: any = { mes, ano };

    // Se não for super_admin ou admin, filtra pelos contratos do usuário
    if (userRole !== "super_admin" && userRole !== "admin") {
      const userContracts = await prisma.userContract.findMany({
        where: { userId },
        select: { contractId: true },
      });
      const contractIds = userContracts.map((c) => c.contractId);
      where.contractId = { in: contractIds };
    }

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
  async getCurrentMonthOrder(contractId: string) {
    const now = new Date();
    const mes = now.getMonth() + 1;
    const ano = now.getFullYear();

    const order = await prisma.order.findFirst({
      where: {
        contractId,
        mes,
        ano,
        isExtraOrder: false,
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
  async getOrderById(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
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
    userId: string,
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

    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) {
      throw new AppError(404, "Contrato não encontrado.");
    }

    // Calcula os snapshots e totais dos itens
    let totalAmount = 0;
    const itemsToCreate = [];

    for (const it of data.items) {
      const pId = it.productId || it.product_id;
      let unitPrice = it.unitPrice || it.unit_price || 0;
      let productSnapshot: any = {};

      if (pId) {
        const prod = await prisma.product.findUnique({
          where: { id: pId },
          include: { category: true, supplier: true },
        });
        if (prod) {
          if (!unitPrice) unitPrice = Number(prod.tabela);
          productSnapshot = {
            productNameSnapshot: prod.name,
            productCodigoSnapshot: prod.codigo,
            productUnidadeSnapshot: prod.unidade,
            productCategoriaSnapshot: prod.category?.name,
            productFornecedorSnapshot: prod.supplier?.tradeName || prod.supplier?.name,
            productTabelaSnapshot: prod.tabela,
            productImageUrlSnapshot: prod.imageUrl,
          };
        }
      }

      const itemTotal = unitPrice * it.quantity;
      totalAmount += itemTotal;

      itemsToCreate.push({
        productId: pId,
        quantity: it.quantity,
        unitPrice,
        ...productSnapshot,
      });
    }

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
    userId: string,
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

    const now = new Date();
    const mes = data.mes || now.getMonth() + 1;
    const ano = data.ano || now.getFullYear();

    let totalAmount = 0;
    const itemsToCreate = [];

    for (const it of data.items) {
      const pId = it.productId || it.product_id;
      let unitPrice = it.unitPrice || it.unit_price || 0;
      let productSnapshot: any = {};

      if (pId) {
        const prod = await prisma.product.findUnique({
          where: { id: pId },
          include: { category: true, supplier: true },
        });
        if (prod) {
          if (!unitPrice) unitPrice = Number(prod.tabela);
          productSnapshot = {
            productNameSnapshot: prod.name,
            productCodigoSnapshot: prod.codigo,
            productUnidadeSnapshot: prod.unidade,
            productCategoriaSnapshot: prod.category?.name,
            productFornecedorSnapshot: prod.supplier?.tradeName || prod.supplier?.name,
            productTabelaSnapshot: prod.tabela,
            productImageUrlSnapshot: prod.imageUrl,
          };
        }
      }

      const itemTotal = unitPrice * it.quantity;
      totalAmount += itemTotal;

      itemsToCreate.push({
        productId: pId,
        quantity: it.quantity,
        unitPrice,
        ...productSnapshot,
      });
    }

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
    orderId: string,
    userId: string,
    data: {
      status: OrderStatus;
      notes?: string;
    },
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
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
      // 1. Atualiza status do pedido e registra auditoria no histórico
      const res = await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          history: {
            create: {
              userId,
              action: `Transição de Status: ${oldStatus} -> ${newStatus}`,
              details: data.notes || null,
              oldStatus,
              newStatus,
            },
          },
        },
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
  async queryItems(orderIds: string[]) {
    const items = await prisma.orderItem.findMany({
      where: { orderId: { in: orderIds } },
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
    orderId: string,
    items: Array<{ product_id: string; quantity: number; unit_price: number }>,
  ) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new AppError(404, "Pedido não encontrado.");
    }

    // Remove itens antigos e recria com novos valores
    await prisma.orderItem.deleteMany({ where: { orderId } });

    let newTotal = 0;
    const itemsToCreate = [];

    for (const it of items) {
      const prod = await prisma.product.findUnique({
        where: { id: it.product_id },
        include: { category: true, supplier: true },
      });

      const unitPrice = it.unit_price;
      newTotal += unitPrice * it.quantity;

      itemsToCreate.push({
        orderId,
        productId: it.product_id,
        quantity: it.quantity,
        unitPrice,
        productNameSnapshot: prod?.name,
        productCodigoSnapshot: prod?.codigo,
        productUnidadeSnapshot: prod?.unidade,
        productCategoriaSnapshot: prod?.category?.name,
        productFornecedorSnapshot: prod?.supplier?.tradeName || prod?.supplier?.name,
        productTabelaSnapshot: prod?.tabela,
        productImageUrlSnapshot: prod?.imageUrl,
      });
    }

    await prisma.orderItem.createMany({ data: itemsToCreate });
    await prisma.order.update({
      where: { id: orderId },
      data: { totalAmount: newTotal },
    });

    return { orderId, newTotal };
  }

  /**
   * Histórico de auditoria do pedido
   */
  async getOrderHistory(orderId: string) {
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

  async addHistory(orderId: string, userId: string, data: { action: string; details?: string | null }) {
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
  async deleteOrder(id: string) {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new AppError(404, "Pedido não encontrado.");
    }
    if (order.status !== "pendente" && order.status !== "rejeitado" && order.status !== "cancelado") {
      throw new AppError(400, "Apenas pedidos pendentes, rejeitados ou cancelados podem ser excluídos.");
    }

    await prisma.order.delete({ where: { id } });
    return { orderId: id };
  }

  // ─── Divergências de Entrega ────────────────────────────────────────────────
  async listDeliveryDivergences(params?: { competenceMonth?: string }) {
    return prisma.orderDeliveryDivergence.findMany({
      include: {
        order: { include: { contract: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createDeliveryDivergence(userId: string, data: { orderId: string; description: string }) {
    return prisma.orderDeliveryDivergence.create({
      data: {
        orderId: data.orderId,
        reportedById: userId,
        description: data.description,
      },
    });
  }

  async resolveDeliveryDivergence(id: string, notes?: string) {
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
  async listIssueReports() {
    return prisma.orderIssueReport.findMany({
      include: {
        order: { include: { contract: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createIssueReport(userId: string, data: { orderId: string; description: string }) {
    return prisma.orderIssueReport.create({
      data: {
        orderId: data.orderId,
        reportedById: userId,
        description: data.description,
      },
    });
  }

  async updateIssueReportStatus(id: string, status: string, notes?: string) {
    return prisma.orderIssueReport.update({
      where: { id },
      data: {
        status,
        notes,
        resolvedAt: status === "resolvido" ? new Date() : undefined,
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
