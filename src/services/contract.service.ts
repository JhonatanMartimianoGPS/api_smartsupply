import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error.middleware.js";

export class ContractService {
  /**
   * Lista contratos operacionais
   */
  async listContracts(params?: { regionalId?: string; active?: boolean }) {
    const where: any = {};
    if (params?.active !== undefined) where.active = params.active;
    if (params?.regionalId) where.regionalId = params.regionalId;

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        regional: true,
        category: true,
      },
      orderBy: { name: "asc" },
    });

    return contracts.map((c) => ({
      ...c,
      regional_id: c.regionalId,
      category_id: c.categoryId,
      total_budget: Number(c.totalBudget),
      used_budget: Number(c.usedBudget),
      unlimited_budget: c.unlimitedBudget,
      allow_extra_order: c.allowExtraOrder,
      budget_locked: c.budgetLocked,
    }));
  }

  /**
   * Detalhes de um contrato por ID
   */
  async getContractById(id: string) {
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        regional: true,
        category: true,
        productCategoryBudgets: {
          include: { productCategory: true },
        },
      },
    });

    if (!contract) {
      throw new AppError(404, "Contrato não encontrado.");
    }

    // Busca o período de orçamento do mês atual (ex: 2026-10)
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const currentPeriod = await prisma.contractBudgetPeriod.findUnique({
      where: {
        contractId_periodMonth: {
          contractId: id,
          periodMonth: currentMonth,
        },
      },
    });

    return {
      ...contract,
      regional_id: contract.regionalId,
      category_id: contract.categoryId,
      total_budget: Number(contract.totalBudget),
      used_budget: Number(contract.usedBudget),
      unlimited_budget: contract.unlimitedBudget,
      allow_extra_order: contract.allowExtraOrder,
      budget_locked: contract.budgetLocked,
      monthly_total_budget: currentPeriod ? Number(currentPeriod.monthlyBudget) : Number(contract.totalBudget),
      monthly_used_budget: currentPeriod ? Number(currentPeriod.usedBudget) : 0,
      monthly_budget_locked: currentPeriod?.budgetLocked ?? contract.budgetLocked,
      current_budget_period: currentPeriod
        ? {
            id: currentPeriod.id,
            contract_id: currentPeriod.contractId,
            period_month: currentPeriod.periodMonth,
            monthly_budget: Number(currentPeriod.monthlyBudget),
            used_budget: Number(currentPeriod.usedBudget),
            budget_locked: currentPeriod.budgetLocked,
          }
        : null,
      subbudgets: contract.productCategoryBudgets.map((sb) => ({
        id: sb.id,
        contractId: sb.contractId,
        productCategoryId: sb.productCategoryId,
        categoryName: sb.productCategory.name,
        allocatedAmount: Number(sb.monthlyBudget),
        usedAmount: 0,
        availableAmount: Number(sb.monthlyBudget),
      })),
    };
  }

  /**
   * Criação de novo contrato
   */
  async createContract(data: {
    name: string;
    code?: string;
    regionalId: string;
    categoryId?: string;
    totalBudget?: number;
    unlimitedBudget?: boolean;
    allowExtraOrder?: boolean;
    allowCustomPrices?: boolean;
    budgetLocked?: boolean;
  }) {
    const contract = await prisma.contract.create({
      data: {
        name: data.name,
        code: data.code,
        regionalId: data.regionalId,
        categoryId: data.categoryId,
        totalBudget: data.totalBudget ?? 0,
        unlimitedBudget: data.unlimitedBudget ?? false,
        allowExtraOrder: data.allowExtraOrder ?? true,
        allowCustomPrices: data.allowCustomPrices ?? false,
        budgetLocked: data.budgetLocked ?? false,
      },
      include: {
        regional: true,
        category: true,
      },
    });

    return {
      ...contract,
      regional_id: contract.regionalId,
      category_id: contract.categoryId,
      total_budget: Number(contract.totalBudget),
      used_budget: Number(contract.usedBudget),
    };
  }

  /**
   * Atualização de contrato
   */
  async updateContract(
    id: string,
    data: {
      name?: string;
      code?: string;
      regionalId?: string;
      categoryId?: string;
      totalBudget?: number;
      unlimitedBudget?: boolean;
      allowExtraOrder?: boolean;
      allowCustomPrices?: boolean;
      budgetLocked?: boolean;
      active?: boolean;
    },
  ) {
    const existing = await prisma.contract.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "Contrato não encontrado.");
    }

    const updated = await prisma.contract.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        regionalId: data.regionalId,
        categoryId: data.categoryId,
        totalBudget: data.totalBudget !== undefined ? data.totalBudget : undefined,
        unlimitedBudget: data.unlimitedBudget,
        allowExtraOrder: data.allowExtraOrder,
        allowCustomPrices: data.allowCustomPrices,
        budgetLocked: data.budgetLocked,
        active: data.active,
      },
      include: {
        regional: true,
        category: true,
      },
    });

    return {
      ...updated,
      regional_id: updated.regionalId,
      category_id: updated.categoryId,
      total_budget: Number(updated.totalBudget),
      used_budget: Number(updated.usedBudget),
    };
  }

  /**
   * Exclusão / Desativação de contrato
   */
  async deleteContract(id: string) {
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: { orders: true },
    });

    if (!contract) {
      throw new AppError(404, "Contrato não encontrado.");
    }

    if (contract.orders.length > 0) {
      await prisma.contract.update({
        where: { id },
        data: { active: false },
      });
      return { id, deactivated: true };
    }

    await prisma.contract.delete({ where: { id } });
    return { id, deleted: true };
  }

  /**
   * Histórico de períodos orçamentários
   */
  async getBudgetHistory(contractId: string) {
    const periods = await prisma.contractBudgetPeriod.findMany({
      where: { contractId },
      orderBy: { periodMonth: "desc" },
    });

    return periods.map((p) => ({
      id: p.id,
      contract_id: p.contractId,
      contractId: p.contractId,
      period_month: p.periodMonth,
      periodMonth: p.periodMonth,
      monthly_budget: Number(p.monthlyBudget),
      monthlyBudget: Number(p.monthlyBudget),
      used_budget: Number(p.usedBudget),
      usedBudget: Number(p.usedBudget),
      budget_locked: p.budgetLocked,
      budgetLocked: p.budgetLocked,
      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString(),
    }));
  }

  /**
   * Consulta em lote de períodos orçamentários
   */
  async getBudgetPeriodsBatch(entries: { contractId: string; periodMonth: string }[]) {
    const result: Record<string, any> = {};

    for (const entry of entries) {
      const key = `${entry.contractId}_${entry.periodMonth}`;
      const period = await prisma.contractBudgetPeriod.findUnique({
        where: {
          contractId_periodMonth: {
            contractId: entry.contractId,
            periodMonth: entry.periodMonth,
          },
        },
      });

      if (period) {
        result[key] = {
          id: period.id,
          contract_id: period.contractId,
          period_month: period.periodMonth,
          monthly_budget: Number(period.monthlyBudget),
          used_budget: Number(period.usedBudget),
          budget_locked: period.budgetLocked,
        };
      }
    }

    return result;
  }

  /**
   * Catálogo de produtos elegíveis para o contrato específico
   */
  async getContractProducts(contractId: string) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: { regional: true },
    });

    if (!contract) {
      throw new AppError(404, "Contrato não encontrado.");
    }

    // Busca produtos da mesma regional ou sem regional associada (globais)
    const products = await prisma.product.findMany({
      where: {
        active: true,
        OR: [
          { regionalId: contract.regionalId },
          { regionalId: null },
        ],
      },
      include: {
        category: true,
        supplier: true,
      },
      orderBy: { name: "asc" },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      codigo: p.codigo || "",
      unidade: p.unidade,
      fornecedor: p.supplier?.tradeName || p.supplier?.name || null,
      categoria: p.category?.name || "Geral",
      tabela: Number(p.tabela),
      valor_unitario: Number(p.tabela),
      image_url: p.imageUrl,
    }));
  }

  /**
   * Último pedido histórico de um contrato (aprovado ou entregue)
   */
  async getLastHistoricalOrder(contractId: string) {
    const order = await prisma.order.findFirst({
      where: {
        contractId,
        status: { in: ["aprovado", "entregue"] },
      },
      include: {
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!order) return null;

    return {
      id: order.id,
      contractId: order.contractId,
      mes: order.mes,
      ano: order.ano,
      status: order.status,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        productName: item.productNameSnapshot || item.product?.name,
      })),
    };
  }
}

export const contractService = new ContractService();
