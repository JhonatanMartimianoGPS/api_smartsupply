import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error.middleware.js";
import { accessService, type AccessUser } from "./access.service.js";

// Teto de eventos por tipo no histórico ("all" não pode varrer a tabela inteira); ficam os mais recentes
const MAX_HISTORY_EVENTS = 5000;

interface DashboardParams {
  periodMonth?: string;
  regionalId?: string | null;
}

/** Contratos que o usuário pode ver, e dentro deles só a regional escolhida no filtro (se houver). */
function contractScope(user: AccessUser, regionalId?: string | null) {
  const access = accessService.contractFilter(user);
  return regionalId ? { AND: [access, { regionalId }] } : access;
}

/**
 * O front manda "YYYY-MM-01", "YYYY-MM" ou "all" (histórico todo, sem filtro de mês).
 * Qualquer outro texto é erro de quem chamou.
 */
function parsePeriod(periodMonth?: string): { ano: number; mes: number } | undefined {
  if (!periodMonth || periodMonth === "all") return undefined;
  const match = /^(\d{4})-(\d{2})(?:-01)?$/.exec(periodMonth);
  const mes = match ? Number(match[2]) : 0;
  if (!match || mes < 1 || mes > 12) {
    throw new AppError(400, "Mês de competência inválido. Use o formato AAAA-MM.");
  }
  return { ano: Number(match[1]), mes };
}

export class DashboardService {
  async getOrderStats(user: AccessUser, params?: DashboardParams) {
    const where: any = { contract: contractScope(user, params?.regionalId) };
    const period = parsePeriod(params?.periodMonth);
    if (period) {
      where.ano = period.ano;
      where.mes = period.mes;
    }

    const orders = await prisma.order.findMany({
      where,
      select: {
        id: true,
        status: true,
        totalAmount: true,
        isExtraOrder: true,
      },
    });

    const totalOrders = orders.length;
    let pendingOrders = 0;
    let approvedOrders = 0;
    let deliveredOrders = 0;
    let rejectedOrders = 0;
    let extraOrders = 0;
    let totalSpent = 0;

    for (const o of orders) {
      const val = Number(o.totalAmount);
      if (o.status === "pendente") pendingOrders++;
      else if (o.status === "aprovado") {
        approvedOrders++;
        totalSpent += val;
      } else if (o.status === "entregue") {
        deliveredOrders++;
        totalSpent += val;
      } else if (o.status === "rejeitado") rejectedOrders++;

      if (o.isExtraOrder) extraOrders++;
    }

    return {
      totalOrders,
      pendingOrders,
      approvedOrders,
      deliveredOrders,
      rejectedOrders,
      extraOrders,
      totalSpent,
      approvedRate: totalOrders > 0 ? ((approvedOrders + deliveredOrders) / totalOrders) * 100 : 0,
    };
  }

  async getContractSpending(user: AccessUser, params?: DashboardParams) {
    const period = parsePeriod(params?.periodMonth);

    const contracts = await prisma.contract.findMany({
      where: { AND: [{ active: true }, contractScope(user, params?.regionalId)] },
      include: {
        regional: true,
        category: { include: { regional: { select: { name: true } } } },
        orders: {
          where: { status: { in: ["aprovado", "entregue"] }, ...(period ?? {}) },
          select: { totalAmount: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return contracts.map((c) => {
      const totalBudget = Number(c.totalBudget);
      const totalSpent = c.orders.reduce((acc, o) => acc + Number(o.totalAmount), 0);
      const remainingBudget = Math.max(0, totalBudget - totalSpent);
      const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

      return {
        contractId: c.id,
        contractName: c.name,
        regionalName: c.regional.name,
        categoryId: c.category?.id ?? null,
        categoryName: c.category?.name ?? "Geral",
        categoryColor: c.category?.color ?? null,
        categoryRegionalName: c.category?.regional?.name ?? null,
        totalBudget,
        totalSpent,
        remainingBudget,
        percentage,
        budgetLocked: c.budgetLocked,
        ordersCount: c.orders.length,
      };
    });
  }

  async getMonthlySpending(user: AccessUser, params?: { regionalId?: string | null }) {
    const where: any = {
      status: { in: ["aprovado", "entregue"] },
      contract: contractScope(user, params?.regionalId),
    };

    const orders = await prisma.order.findMany({
      where,
      select: { ano: true, mes: true, totalAmount: true },
      orderBy: [{ ano: "asc" }, { mes: "asc" }],
    });

    const monthMap = new Map<string, { totalSpent: number; ordersCount: number }>();
    for (const o of orders) {
      const key = `${o.ano}-${String(o.mes).padStart(2, "0")}`;
      const curr = monthMap.get(key) || { totalSpent: 0, ordersCount: 0 };
      curr.totalSpent += Number(o.totalAmount);
      curr.ordersCount++;
      monthMap.set(key, curr);
    }

    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return Array.from(monthMap.entries()).map(([month, data]) => {
      const [year, mStr] = month.split("-");
      const mIdx = parseInt(mStr, 10) - 1;
      const monthLabel = mIdx >= 0 && mIdx < 12 ? `${monthNames[mIdx]}/${year?.slice(2) || ""}` : month;
      return {
        month,
        monthLabel,
        totalSpent: data.totalSpent,
        ordersCount: data.ordersCount,
      };
    });
  }

  async getCategorySpending(user: AccessUser, params?: DashboardParams) {
    const period = parsePeriod(params?.periodMonth);
    const scope = { AND: [{ active: true }, contractScope(user, params?.regionalId)] };

    // Só entram categorias que têm pelo menos um contrato visível para o usuário
    const categories = await prisma.contractCategory.findMany({
      where: { active: true, contracts: { some: scope } },
      include: {
        regional: { select: { name: true } },
        contracts: {
          where: scope,
          include: {
            orders: { where: { status: { in: ["aprovado", "entregue"] }, ...(period ?? {}) }, select: { totalAmount: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return categories.map((cat) => {
      let totalSpent = 0;
      let totalBudget = 0;
      let ordersCount = 0;

      for (const c of cat.contracts) {
        totalBudget += Number(c.totalBudget);
        totalSpent += c.orders.reduce((acc, o) => acc + Number(o.totalAmount), 0);
        ordersCount += c.orders.length;
      }

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        categoryRegionalName: cat.regional?.name ?? null,
        color: cat.color || "#3B82F6",
        totalBudget,
        totalSpent,
        ordersCount,
        percentage: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
      };
    });
  }

  async getProductAndSupplierSpending(user: AccessUser, params?: DashboardParams) {
    const whereOrder: any = {
      status: { in: ["aprovado", "entregue"] },
      contract: contractScope(user, params?.regionalId),
    };
    const period = parsePeriod(params?.periodMonth);
    if (period) {
      whereOrder.ano = period.ano;
      whereOrder.mes = period.mes;
    }

    const items = await prisma.orderItem.findMany({
      where: { order: whereOrder },
      select: {
        id: true,
        productId: true,
        quantity: true,
        unitPrice: true,
        productNameSnapshot: true,
        productCodigoSnapshot: true,
        productCategoriaSnapshot: true,
        productFornecedorSnapshot: true,
        product: { select: { name: true, codigo: true, category: { select: { name: true } } } },
        order: { select: { contractId: true } },
      },
    });

    const productMap = new Map<string, {
      productId: string;
      productName: string;
      productCode: string;
      category: string;
      quantity: number;
      totalSpent: number;
      contracts: Set<string>;
    }>();
    const supplierMap = new Map<string, {
      supplierName: string;
      totalSpent: number;
      totalQuantity: number;
      ordersCount: number;
    }>();

    for (const it of items) {
      const pName = it.productNameSnapshot || it.product?.name || "Desconhecido";
      const pCode = it.productCodigoSnapshot || it.product?.codigo || "";
      const pCat = it.productCategoriaSnapshot || it.product?.category?.name || "Geral";
      const pId = it.productId || it.id;
      const sName = it.productFornecedorSnapshot || "Outros";
      const total = Number(it.unitPrice) * it.quantity;

      const pData = productMap.get(pName) || {
        productId: pId,
        productName: pName,
        productCode: pCode,
        category: pCat,
        quantity: 0,
        totalSpent: 0,
        contracts: new Set<string>(),
      };
      pData.quantity += it.quantity;
      pData.totalSpent += total;
      if (it.order?.contractId) {
        pData.contracts.add(it.order.contractId);
      }
      productMap.set(pName, pData);

      const sData = supplierMap.get(sName) || {
        supplierName: sName,
        totalSpent: 0,
        totalQuantity: 0,
        ordersCount: 0,
      };
      sData.totalSpent += total;
      sData.totalQuantity += it.quantity;
      sData.ordersCount++;
      supplierMap.set(sName, sData);
    }

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
      .map((p) => ({
        productId: p.productId,
        productName: p.productName,
        productCode: p.productCode,
        category: p.category,
        totalQuantity: p.quantity,
        totalSpent: p.totalSpent,
        contractCount: p.contracts.size,
      }));

    const topSuppliers = Array.from(supplierMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
      .map((s) => ({
        supplierName: s.supplierName,
        totalSpent: s.totalSpent,
        totalQuantity: s.totalQuantity,
        ordersCount: s.ordersCount,
      }));

    return { topProducts, topSuppliers };
  }

  /**
   * Base do gráfico "pedidos criados x aprovados por dia". Cada linha é um evento:
   * "criado" (data de criação do pedido) ou "aprovado" (transição de status para aprovado).
   * monthKey: "YYYY-MM" (mês em horário de Brasília) ou "all". Ordem crescente de data.
   */
  async getApprovalHistory(user: AccessUser, params?: { monthKey?: string; regionalId?: string | null }) {
    const period = parsePeriod(params?.monthKey);
    const contract = contractScope(user, params?.regionalId);

    // O mês vai de 00:00 de Brasília (UTC-3) do dia 1 até 00:00 do mês seguinte
    const range = period
      ? {
          gte: new Date(Date.UTC(period.ano, period.mes - 1, 1, 3)),
          lt: new Date(Date.UTC(period.ano, period.mes, 1, 3)),
        }
      : undefined;

    const [created, approvals] = await Promise.all([
      prisma.order.findMany({
        where: { contract, ...(range ? { createdAt: range } : {}) },
        select: { id: true, createdById: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: MAX_HISTORY_EVENTS,
      }),
      prisma.orderHistory.findMany({
        where: { newStatus: "aprovado", order: { contract }, ...(range ? { createdAt: range } : {}) },
        select: { id: true, orderId: true, userId: true, details: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: MAX_HISTORY_EVENTS,
      }),
    ]);

    const rows = [
      ...created.map((o) => ({
        id: `criado-${o.id}`,
        action: "criado",
        created_at: o.createdAt.toISOString(),
        order_id: o.id,
        user_id: o.createdById,
        details: null as string | null,
      })),
      ...approvals.map((h) => ({
        id: h.id,
        action: "aprovado",
        created_at: h.createdAt.toISOString(),
        order_id: h.orderId,
        user_id: h.userId,
        details: h.details,
      })),
    ];

    return rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
}

export const dashboardService = new DashboardService();
