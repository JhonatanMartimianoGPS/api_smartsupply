import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error.middleware.js";
import { accessService, type AccessUser } from "./access.service.js";
import { orderService } from "./order.service.js";

/** Mês atual no fuso de São Paulo, como "YYYY-MM" (o mesmo fuso e período que o frontend usa). */
function currentBudgetMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  return `${year}-${month}`;
}

/** Aceita "YYYY-MM" ou "YYYY-MM-01" (o frontend manda a data) e devolve "YYYY-MM", o formato guardado no banco. */
function parsePeriodMonth(value: unknown) {
  const match = typeof value === "string" ? /^(\d{4})-(0[1-9]|1[0-2])(-\d{2})?$/.exec(value) : null;
  if (!match) {
    throw new AppError(400, "Competência inválida. Use o formato AAAA-MM.");
  }
  return `${match[1]}-${match[2]}`;
}

/** O frontend compara o mês como data ("2026-10-01"), então a resposta usa esse formato. */
const toPeriodDate = (periodMonth: string) => `${periodMonth}-01`;

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
  async getContractById(user: AccessUser, id: string) {
    await accessService.assertContractAccess(user, id);

    // Período de orçamento do mês atual (ex: 2026-10), calculado uma vez só
    const currentMonth = currentBudgetMonth();
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        regional: true,
        category: true,
        productCategoryBudgets: {
          include: {
            productCategory: true,
            periods: { where: { periodMonth: currentMonth } },
          },
        },
      },
    });

    if (!contract) {
      throw new AppError(404, "Contrato não encontrado.");
    }

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
            period_month: toPeriodDate(currentPeriod.periodMonth),
            monthly_budget: Number(currentPeriod.monthlyBudget),
            used_budget: Number(currentPeriod.usedBudget),
            budget_locked: currentPeriod.budgetLocked,
          }
        : null,
      subbudgets: contract.productCategoryBudgets.map((sb) => {
        const allocated = Number(sb.periods[0] ? sb.periods[0].monthlyBudget : sb.monthlyBudget);
        const used = Number(sb.periods[0]?.usedBudget ?? 0);
        return {
          id: sb.id,
          contractId: sb.contractId,
          productCategoryId: sb.productCategoryId,
          categoryName: sb.productCategory.name,
          allocatedAmount: allocated,
          usedAmount: used,
          availableAmount: allocated - used,
        };
      }),
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
  async getBudgetHistory(user: AccessUser, contractId: string) {
    await accessService.assertContractAccess(user, contractId);

    const periods = await prisma.contractBudgetPeriod.findMany({
      where: { contractId },
      orderBy: { periodMonth: "desc" },
      take: 120,
    });

    return periods.map((p) => ({
      id: p.id,
      contract_id: p.contractId,
      contractId: p.contractId,
      period_month: toPeriodDate(p.periodMonth),
      periodMonth: toPeriodDate(p.periodMonth),
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
   * Consulta em lote de períodos orçamentários. A chave da resposta é "<contrato>_<mês>" com o mês
   * exatamente como o cliente mandou. Contratos fora do acesso do usuário ficam de fora.
   */
  async getBudgetPeriodsBatch(user: AccessUser, entries: { contractId: string; periodMonth: string }[]) {
    if (!Array.isArray(entries) || entries.length > 500) {
      throw new AppError(400, "entries deve ser uma lista de até 500 itens.");
    }
    const requested = entries
      .filter((e) => typeof e?.contractId === "string")
      .map((e) => ({ key: `${e.contractId}_${e.periodMonth}`, contractId: e.contractId, periodMonth: parsePeriodMonth(e.periodMonth) }));
    if (requested.length === 0) return {};

    const allowed = await prisma.contract.findMany({
      where: { AND: [{ id: { in: [...new Set(requested.map((e) => e.contractId))] } }, accessService.contractFilter(user)] },
      select: { id: true },
    });
    const allowedIds = new Set(allowed.map((c) => c.id));

    const periods = await prisma.contractBudgetPeriod.findMany({
      where: {
        contractId: { in: [...allowedIds] },
        periodMonth: { in: [...new Set(requested.map((e) => e.periodMonth))] },
      },
    });
    const periodByKey = new Map(periods.map((p) => [`${p.contractId}_${p.periodMonth}`, p]));

    const result: Record<string, any> = {};
    for (const entry of requested) {
      const period = periodByKey.get(`${entry.contractId}_${entry.periodMonth}`);
      if (!period) continue;
      result[entry.key] = {
        id: period.id,
        contract_id: period.contractId,
        period_month: toPeriodDate(period.periodMonth),
        monthly_budget: Number(period.monthlyBudget),
        used_budget: Number(period.usedBudget),
        budget_locked: period.budgetLocked,
      };
    }

    return result;
  }

  // ─── Suborçamentos por categoria de produto ─────────────────────────────────
  // Ver exige acesso ao contrato; criar, alterar e ativar/desativar é só de suprimentos e admin
  // (as mesmas regras da RLS do Supabase).

  private formatSubbudget(b: {
    id: string;
    contractId: string;
    productCategoryId: string;
    monthlyBudget: Prisma.Decimal;
    active: boolean;
    deactivatedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: b.id,
      contract_id: b.contractId,
      contractId: b.contractId,
      product_category_id: b.productCategoryId,
      productCategoryId: b.productCategoryId,
      monthly_budget: Number(b.monthlyBudget),
      monthlyBudget: Number(b.monthlyBudget),
      active: b.active,
      deactivated_at: b.deactivatedAt ? b.deactivatedAt.toISOString() : null,
      created_at: b.createdAt.toISOString(),
      updated_at: b.updatedAt.toISOString(),
    };
  }

  private assertCanManageSubbudgets(user: AccessUser) {
    if (!accessService.isSuprimentos(user)) {
      throw new AppError(403, "Apenas usuários de suprimentos ou administradores podem gerenciar suborçamentos.");
    }
  }

  private parseMonthlyBudget(value: unknown) {
    const amount = typeof value === "number" ? value : Number.NaN;
    if (!Number.isFinite(amount) || amount < 0 || amount > 9_999_999_999.99) {
      throw new AppError(400, "O orçamento mensal deve ser um número entre zero e 9.999.999.999,99.");
    }
    return Math.round(amount * 100) / 100;
  }

  /**
   * Quando o limite de uma categoria muda (ou ela é reativada), o período do mês atual passa a ter
   * o limite novo e o consumo recalculado (era um gatilho no Supabase).
   */
  private async syncCurrentCategoryPeriod(tx: Prisma.TransactionClient, contractId: string) {
    const [ano, mes] = currentBudgetMonth().split("-").map(Number);
    await orderService.recalculateCategoryBudgets(tx, contractId, ano, mes);
  }

  async listSubbudgets(user: AccessUser, contractId: string) {
    await accessService.assertContractAccess(user, contractId);
    const budgets = await prisma.contractProductCategoryBudget.findMany({
      where: { contractId },
      orderBy: { createdAt: "asc" },
    });
    return budgets.map((b) => this.formatSubbudget(b));
  }

  async listSubbudgetPeriods(user: AccessUser, contractId: string) {
    await accessService.assertContractAccess(user, contractId);
    const periods = await prisma.contractProductCategoryBudgetPeriod.findMany({
      where: { contractId },
      include: { budget: { select: { productCategoryId: true } } },
      orderBy: [{ periodMonth: "desc" }, { createdAt: "asc" }],
    });
    return periods.map((p) => ({
      id: p.id,
      contract_product_category_budget_id: p.contractProductCategoryBudgetId,
      contract_id: p.contractId,
      product_category_id: p.budget.productCategoryId,
      period_month: toPeriodDate(p.periodMonth),
      monthly_budget: Number(p.monthlyBudget),
      used_budget: Number(p.usedBudget),
      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString(),
    }));
  }

  async createSubbudget(user: AccessUser, contractId: string, data: { productCategoryId?: string; monthlyBudget?: number }) {
    this.assertCanManageSubbudgets(user);
    await accessService.assertContractAccess(user, contractId);
    if (typeof data?.productCategoryId !== "string" || !data.productCategoryId) {
      throw new AppError(400, "A categoria de produto é obrigatória.");
    }
    const monthlyBudget = this.parseMonthlyBudget(data.monthlyBudget);

    const category = await prisma.productCategory.findUnique({ where: { id: data.productCategoryId }, select: { id: true } });
    if (!category) {
      throw new AppError(404, "Categoria de produto não encontrada.");
    }

    const duplicated = new AppError(409, "Este contrato já possui um suborçamento para esta categoria.");

    try {
      const created = await prisma.$transaction(async (tx) => {
        const budget = await tx.contractProductCategoryBudget.create({
          data: { contractId, productCategoryId: data.productCategoryId!, monthlyBudget },
        });
        await this.syncCurrentCategoryPeriod(tx, contractId);
        return budget;
      });
      return this.formatSubbudget(created);
    } catch (error) {
      // Categoria repetida (inclusive dois cadastros ao mesmo tempo): o índice único do banco barra
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw duplicated;
      throw error;
    }
  }

  /** Busca o suborçamento já validando o acesso ao contrato dele (404 se não existir ou estiver fora do acesso). */
  private async findSubbudgetForUser(user: AccessUser, id: string) {
    const budget = await prisma.contractProductCategoryBudget.findUnique({ where: { id } });
    if (!budget) {
      throw new AppError(404, "Suborçamento não encontrado.");
    }
    await accessService.assertContractAccess(user, budget.contractId, "Suborçamento não encontrado.");
    return budget;
  }

  async updateSubbudget(user: AccessUser, id: string, data: { monthlyBudget?: number }) {
    this.assertCanManageSubbudgets(user);
    const monthlyBudget = this.parseMonthlyBudget(data?.monthlyBudget);
    const budget = await this.findSubbudgetForUser(user, id);

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.contractProductCategoryBudget.update({ where: { id }, data: { monthlyBudget } });
      // Suborçamento desativado não mexe nos períodos (como no gatilho original)
      if (result.active) await this.syncCurrentCategoryPeriod(tx, budget.contractId);
      return result;
    });
    return this.formatSubbudget(updated);
  }

  async setSubbudgetActive(user: AccessUser, id: string, active: unknown) {
    this.assertCanManageSubbudgets(user);
    if (typeof active !== "boolean") {
      throw new AppError(400, "O campo active deve ser verdadeiro ou falso.");
    }
    const budget = await this.findSubbudgetForUser(user, id);
    if (budget.active === active) return this.formatSubbudget(budget);

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.contractProductCategoryBudget.update({
        where: { id },
        data: { active, deactivatedAt: active ? null : new Date() },
      });
      if (active) await this.syncCurrentCategoryPeriod(tx, budget.contractId);
      return result;
    });
    return this.formatSubbudget(updated);
  }

  /**
   * Quanto do orçamento do contrato foi gasto na competência e com o quê: pedidos mensais e extras
   * aprovados ou entregues, solicitações aprovadas e chamados concluídos (do mês de criação).
   */
  async getBudgetBreakdown(user: AccessUser, contractId: string, periodMonthInput?: string) {
    await accessService.assertContractAccess(user, contractId);
    const periodMonth = periodMonthInput ? parsePeriodMonth(periodMonthInput) : currentBudgetMonth();
    const [ano, mes] = periodMonth.split("-").map(Number);
    // As datas das tabelas ficam em UTC (sem fuso): o mês é uma faixa que começa à meia-noite de São Paulo
    const monthStart = `${periodMonth}-01`;

    const [orders, solicitations, tickets] = await Promise.all([
      prisma.order.groupBy({
        by: ["isExtraOrder"],
        where: { contractId, ano, mes, status: { in: ["aprovado", "entregue"] } },
        _sum: { totalAmount: true },
      }),
      // Solicitação concluída: o frontend grava "concluido" (como o Supabase); "aprovada" é vocabulário antigo
      // Valor = quantidade x preço gravado no item.
      prisma.$queryRaw<Array<{ total: unknown }>>`
        SELECT COALESCE(SUM(si.quantity * si.unit_price), 0) AS total
        FROM solicitations s
        JOIN solicitation_items si ON si.solicitation_id = s.id
        WHERE s.contract_id = ${contractId}
          AND s.status IN ('concluido', 'aprovada')
          AND s.created_at >= (${monthStart}::timestamp AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'UTC'
          AND s.created_at < ((${monthStart}::timestamp + interval '1 month') AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'UTC'`,
      prisma.$queryRaw<Array<{ total: unknown }>>`
        SELECT COALESCE(SUM(final_cost), 0) AS total
        FROM service_tickets
        WHERE contract_id = ${contractId}
          AND status = 'concluido'
          AND created_at >= (${monthStart}::timestamp AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'UTC'
          AND created_at < ((${monthStart}::timestamp + interval '1 month') AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'UTC'`,
    ]);

    const ordersSum = (isExtra: boolean) => Number(orders.find((o) => o.isExtraOrder === isExtra)?._sum.totalAmount ?? 0);
    return {
      monthlyOrdersSum: ordersSum(false),
      extraOrdersSum: ordersSum(true),
      solicitationsSum: Number(solicitations[0]?.total ?? 0),
      serviceTicketsSum: Number(tickets[0]?.total ?? 0),
    };
  }

  /**
   * Catálogo de produtos elegíveis para o contrato específico
   */
  async getContractProducts(user: AccessUser, contractId: string) {
    await accessService.assertContractAccess(user, contractId);
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
  async getLastHistoricalOrder(user: AccessUser, contractId: string) {
    await accessService.assertContractAccess(user, contractId);
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
