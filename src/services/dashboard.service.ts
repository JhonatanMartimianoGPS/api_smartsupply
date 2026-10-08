import { prisma } from "../lib/prisma.js";

export class DashboardService {
  async getOrderStats(params?: { periodMonth?: string; regionalId?: string | null }) {
    const where: any = {};
    if (params?.regionalId) where.contract = { regionalId: params.regionalId };
    if (params?.periodMonth) {
      const [ano, mes] = params.periodMonth.split("-").map(Number);
      if (ano && mes) {
        where.ano = ano;
        where.mes = mes;
      }
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

  async getContractSpending(params?: { periodMonth?: string; regionalId?: string | null }) {
    const where: any = { active: true };
    if (params?.regionalId) where.regionalId = params.regionalId;

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        regional: true,
        category: true,
        orders: params?.periodMonth
          ? {
              where: {
                ano: Number(params.periodMonth.split("-")[0]),
                mes: Number(params.periodMonth.split("-")[1]),
                status: { in: ["aprovado", "entregue"] },
              },
            }
          : {
              where: { status: { in: ["aprovado", "entregue"] } },
            },
      },
    });

    return contracts.map((c) => {
      const totalBudget = Number(c.totalBudget);
      const usedBudget = c.orders.reduce((acc, o) => acc + Number(o.totalAmount), 0);
      const remainingBudget = Math.max(0, totalBudget - usedBudget);
      const percentage = totalBudget > 0 ? (usedBudget / totalBudget) * 100 : 0;

      return {
        contractId: c.id,
        contractName: c.name,
        regionalName: c.regional.name,
        categoryName: c.category?.name || "Geral",
        totalBudget,
        usedBudget,
        remainingBudget,
        percentage,
        ordersCount: c.orders.length,
      };
    });
  }

  async getMonthlySpending(params?: { regionalId?: string | null }) {
    const where: any = { status: { in: ["aprovado", "entregue"] } };
    if (params?.regionalId) where.contract = { regionalId: params.regionalId };

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
        total: data.totalSpent,
        totalSpent: data.totalSpent,
        totalValue: data.totalSpent,
        orderCount: data.ordersCount,
        ordersCount: data.ordersCount,
      };
    });
  }

  async getCategorySpending(params?: { periodMonth?: string; regionalId?: string | null }) {
    const where: any = { active: true };
    if (params?.regionalId) where.regionalId = params.regionalId;

    const categories = await prisma.contractCategory.findMany({
      where,
      include: {
        contracts: {
          include: {
            orders: params?.periodMonth
              ? {
                  where: {
                    ano: Number(params.periodMonth.split("-")[0]),
                    mes: Number(params.periodMonth.split("-")[1]),
                    status: { in: ["aprovado", "entregue"] },
                  },
                }
              : {
                  where: { status: { in: ["aprovado", "entregue"] } },
                },
          },
        },
      },
    });

    return categories.map((cat) => {
      let totalSpent = 0;
      let totalBudget = 0;

      for (const c of cat.contracts) {
        totalBudget += Number(c.totalBudget);
        totalSpent += c.orders.reduce((acc, o) => acc + Number(o.totalAmount), 0);
      }

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        category: cat.name,
        color: cat.color || "#3B82F6",
        totalBudget,
        totalSpent,
        total: totalSpent,
        percentage: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
      };
    });
  }

  async getProductAndSupplierSpending(params?: { periodMonth?: string; regionalId?: string | null }) {
    const whereOrder: any = { status: { in: ["aprovado", "entregue"] } };
    if (params?.regionalId) whereOrder.contract = { regionalId: params.regionalId };
    if (params?.periodMonth) {
      const [ano, mes] = params.periodMonth.split("-").map(Number);
      if (ano && mes) {
        whereOrder.ano = ano;
        whereOrder.mes = mes;
      }
    }

    const items = await prisma.orderItem.findMany({
      where: { order: whereOrder },
      include: {
        product: { include: { category: true } },
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
        quantity: p.quantity,
        totalSpent: p.totalSpent,
        totalValue: p.totalSpent,
        contractCount: p.contracts.size,
      }));

    const topSuppliers = Array.from(supplierMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
      .map((s) => ({
        supplier: s.supplierName,
        supplierName: s.supplierName,
        totalSpent: s.totalSpent,
        totalValue: s.totalSpent,
        totalQuantity: s.totalQuantity,
        ordersCount: s.ordersCount,
        orderCount: s.ordersCount,
      }));

    return { topProducts, topSuppliers };
  }

  async getApprovalHistory(params?: { monthKey?: string; regionalId?: string | null }) {
    const where: any = { action: { contains: "Status" } };
    if (params?.regionalId) where.order = { contract: { regionalId: params.regionalId } };

    const history = await prisma.orderHistory.findMany({
      where,
      include: {
        order: { include: { contract: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return history.map((h) => ({
      id: h.id,
      orderId: h.orderId,
      contractName: h.order.contract.name,
      action: h.action,
      details: h.details,
      createdAt: h.createdAt.toISOString(),
    }));
  }
}

export const dashboardService = new DashboardService();
