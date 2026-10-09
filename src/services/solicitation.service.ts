import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error.middleware.js";
import { accessService, type AccessUser } from "./access.service.js";
import { notificationService } from "./notification.service.js";

// Solicitação é fora de catálogo: o item pode ter só a descrição, sem produto
type ItemInput = { product_id?: string; quantity: number; unit_price?: number; description?: string };

// Quem pode editar itens e avançar etapas (no Supabase: policies de UPDATE de admin, suprimentos e gestor)
const MANAGER_ROLES = ["super_admin", "admin", "suprimentos", "gestor"];
// Status em que a solicitação pode ser apagada (o front usa "rejeitado")
const DELETABLE_STATUSES = ["rejeitado", "rejeitada"];
// Solicitação encerrada não tem mais os itens editados (mexeria no orçamento já fechado)
const CLOSED_STATUSES = ["concluido", "rejeitado", "rejeitada", "aprovada"];
// Limites que cabem no banco (Int e Decimal(10,2)/Decimal(12,2)) e no tamanho razoável de uma tela
const MAX_ITEMS = 200;
const MAX_QUANTITY = 1_000_000;
const MAX_UNIT_PRICE = 99_999_999.99;
const MAX_TOTAL = 9_999_999_999.99;
const MAX_TEXT = 2000;

const optionalText = (value: unknown, field: string, max = MAX_TEXT) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || value.length > max) {
    throw new AppError(400, `${field} inválido.`);
  }
  return value;
};

// Tudo que as telas de solicitação leem (lista, detalhe, modal do assistente)
const SOLICITATION_INCLUDE = {
  contract: { include: { regional: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  items: {
    include: {
      product: { include: { category: { select: { name: true } }, supplier: { select: { name: true } } } },
    },
  },
} as const;

const HISTORY_INCLUDE = { user: { select: { name: true } } } as const;

// Transitório: o frontend ainda lê os nomes do Supabase (solicitation_items, created_at, user_profile,
// unit_price, product.tabela). A API devolve os dois nomes até o front migrar (docs/api-contract.md).
function formatItem(it: any) {
  const unitPrice = Number(it.unitPrice);
  const product = it.product
    ? {
        id: it.product.id,
        name: it.product.name,
        codigo: it.product.codigo,
        unidade: it.product.unidade,
        tabela: Number(it.product.tabela),
        fornecedor: it.product.supplier?.name ?? null,
        categoria: it.product.category?.name ?? null,
      }
    : null;
  return {
    ...it,
    product,
    product_id: it.productId,
    solicitation_id: it.solicitationId,
    unitPrice,
    unit_price: unitPrice,
    total: Math.round(unitPrice * it.quantity * 100) / 100,
    created_at: it.createdAt?.toISOString?.() ?? it.createdAt,
  };
}

function formatHistory(h: any) {
  return {
    ...h,
    solicitation_id: h.solicitationId,
    user_id: h.userId,
    to_step: h.step,
    details: h.notes,
    created_at: h.createdAt?.toISOString?.() ?? h.createdAt,
    user_profile: { full_name: h.user?.name ?? "Usuário" },
  };
}

function formatSolicitation(s: any) {
  const items = (s.items ?? []).map(formatItem);
  const totalAmount = Number(s.totalAmount);
  return {
    ...s,
    contract_id: s.contractId,
    user_id: s.createdById,
    user_profile: s.createdBy ? { full_name: s.createdBy.name } : null,
    contract: s.contract
      ? {
          ...s.contract,
          regional_id: s.contract.regionalId,
          regional_name: s.contract.regional?.name ?? null,
          allow_custom_prices: s.contract.allowCustomPrices,
        }
      : null,
    totalAmount,
    total_amount: totalAmount,
    items,
    solicitation_items: items,
    history: s.history ? s.history.map(formatHistory) : undefined,
    created_at: s.createdAt?.toISOString?.() ?? s.createdAt,
    updated_at: s.updatedAt?.toISOString?.() ?? s.updatedAt,
  };
}

export class SolicitationService {
  /**
   * Escopo de leitura (no Supabase eram as policies de SELECT):
   * admin, suprimentos e gestor veem as dos contratos que acessam; os demais perfis só as próprias.
   */
  private scope(user: AccessUser) {
    return MANAGER_ROLES.includes(user.role)
      ? { contract: accessService.contractFilter(user) }
      : { createdById: user.userId };
  }

  /** Busca uma solicitação dentro do escopo do usuário; responde 404 se não existir ou for de outro escopo. */
  private async findAccessible(user: AccessUser, id: string) {
    const s = await prisma.solicitation.findFirst({ where: { AND: [{ id }, this.scope(user)] } });
    if (!s) {
      throw new AppError(404, "Solicitação não encontrada.");
    }
    return s;
  }

  private assertCanManage(user: AccessUser) {
    if (!MANAGER_ROLES.includes(user.role)) {
      throw new AppError(403, "Você não tem permissão para alterar solicitações.");
    }
  }

  private async prepareItems(items: unknown): Promise<ItemInput[]> {
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError(400, "Informe pelo menos um item.");
    }
    if (items.length > MAX_ITEMS) {
      throw new AppError(400, `Uma solicitação aceita no máximo ${MAX_ITEMS} itens.`);
    }
    let total = 0;
    for (const it of items as ItemInput[]) {
      if (!it || typeof it !== "object") {
        throw new AppError(400, "Item inválido.");
      }
      if (it.product_id !== undefined && it.product_id !== null && typeof it.product_id !== "string") {
        throw new AppError(400, "Produto do item inválido.");
      }
      optionalText(it.description, "Descrição do item", 500);
      const hasProduct = typeof it.product_id === "string" && it.product_id !== "";
      const hasDescription = typeof it.description === "string" && it.description.trim() !== "";
      if (!hasProduct && !hasDescription) {
        throw new AppError(400, "Cada item precisa de um produto ou de uma descrição.");
      }
      if (!Number.isInteger(it.quantity) || it.quantity <= 0 || it.quantity > MAX_QUANTITY) {
        throw new AppError(400, "A quantidade de cada item deve ser um número inteiro maior que zero.");
      }
      if (it.unit_price !== undefined && it.unit_price !== null) {
        if (typeof it.unit_price !== "number" || !(it.unit_price >= 0) || it.unit_price > MAX_UNIT_PRICE) {
          throw new AppError(400, "O preço unitário deve estar entre zero e 99.999.999,99.");
        }
      }
      total += (it.unit_price || 0) * it.quantity;
    }
    if (total > MAX_TOTAL) {
      throw new AppError(400, "O valor total da solicitação é grande demais.");
    }

    // Produto informado precisa existir (senão o banco recusaria com erro de chave estrangeira)
    const productIds = [...new Set((items as ItemInput[]).map((it) => it.product_id).filter(Boolean))] as string[];
    if (productIds.length > 0) {
      const found = await prisma.product.count({ where: { id: { in: productIds } } });
      if (found !== productIds.length) {
        throw new AppError(400, "Um dos produtos informados não existe.");
      }
    }
    return items as ItemInput[];
  }

  async listSolicitations(user: AccessUser, params?: { contractId?: string; status?: string }) {
    const where: any = { AND: [this.scope(user)] };
    if (params?.contractId) where.AND.push({ contractId: params.contractId });
    if (params?.status) where.AND.push({ status: params.status });

    const solicitations = await prisma.solicitation.findMany({
      where,
      include: SOLICITATION_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return solicitations.map(formatSolicitation);
  }

  async getSolicitationById(user: AccessUser, id: string) {
    const s = await prisma.solicitation.findFirst({
      where: { AND: [{ id }, this.scope(user)] },
      include: { ...SOLICITATION_INCLUDE, history: { include: HISTORY_INCLUDE, orderBy: { createdAt: "desc" } } },
    });

    if (!s) {
      throw new AppError(404, "Solicitação não encontrada.");
    }
    return formatSolicitation(s);
  }

  async createSolicitation(
    user: AccessUser,
    data: {
      contractId: string;
      items: ItemInput[];
      notes?: string;
    },
  ) {
    const userId = user.userId;
    await accessService.assertContractAccess(user, data.contractId);
    const items = await this.prepareItems(data.items);
    const notes = optionalText(data.notes, "Observação");

    let totalAmount = 0;
    const itemsToCreate = items.map((it) => {
      const price = it.unit_price || 0;
      totalAmount += price * it.quantity;
      return {
        productId: it.product_id || null,
        quantity: it.quantity,
        unitPrice: price,
        description: it.description,
      };
    });

    const solicitation = await prisma.solicitation.create({
      data: {
        contractId: data.contractId,
        createdById: userId,
        status: "pendente",
        step: "aguardando_aprovacao_gestor",
        notes,
        totalAmount,
        items: { create: itemsToCreate },
        history: {
          create: {
            userId,
            action: "Criação de Solicitação Especial",
            step: "aguardando_aprovacao_gestor",
            notes,
          },
        },
      },
      include: SOLICITATION_INCLUDE,
    });

    await notificationService.solicitationCreated({
      solicitationId: solicitation.id,
      contract: solicitation.contract,
      actorId: userId,
    });
    return formatSolicitation(solicitation);
  }

  async updateItems(user: AccessUser, id: string, itemsInput: unknown) {
    this.assertCanManage(user);
    await this.findAccessible(user, id);
    const items = await this.prepareItems(itemsInput);

    let totalAmount = 0;
    const itemsToCreate = items.map((it) => {
      const price = it.unit_price || 0;
      totalAmount += price * it.quantity;
      return {
        solicitationId: id,
        productId: it.product_id || null,
        quantity: it.quantity,
        unitPrice: price,
        description: it.description,
      };
    });

    // Troca os itens e o total numa transação: se algo falhar, a solicitação não fica sem itens.
    // O primeiro passo (update do total) trava a linha: dois PUT ao mesmo tempo esperam um pelo outro
    // e o segundo já apaga os itens do primeiro, em vez de somar as duas listas.
    return prisma.$transaction(async (tx) => {
      const locked = await tx.solicitation.updateMany({
        where: { id, status: { notIn: CLOSED_STATUSES } },
        data: { totalAmount },
      });
      if (locked.count === 0) {
        throw new AppError(409, "Solicitação encerrada ou já excluída: os itens não podem mais ser alterados.");
      }
      await tx.solicitationItem.deleteMany({ where: { solicitationId: id } });
      await tx.solicitationItem.createMany({ data: itemsToCreate });
      const saved = await tx.solicitationItem.findMany({
        where: { solicitationId: id },
        include: SOLICITATION_INCLUDE.items.include,
      });
      return saved.map(formatItem);
    });
  }

  async updateStep(
    user: AccessUser,
    id: string,
    data: {
      step: string;
      status: string;
      notes?: string | null;
      fromStep?: string | null;
      action?: string;
    },
  ) {
    this.assertCanManage(user);
    const userId = user.userId;
    const s = await this.findAccessible(user, id);
    if (typeof data?.step !== "string" || !data.step || typeof data?.status !== "string" || !data.status) {
      throw new AppError(400, "Etapa e status são obrigatórios.");
    }

    const notes = optionalText(data.notes, "Observação");
    const action = optionalText(data.action, "Ação", 200);
    const fromStep = optionalText(data.fromStep, "Etapa de origem", 100);

    // Só atualiza se a etapa e o status continuam os que lemos: evita sobrescrever a mudança de outra pessoa
    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.solicitation.updateMany({
        where: { id, step: s.step, status: s.status },
        data: { step: data.step, status: data.status },
      });
      if (changed.count === 0) {
        throw new AppError(409, "A solicitação foi alterada por outra pessoa. Atualize a página e tente de novo.");
      }
      await tx.solicitationHistory.create({
        data: {
          solicitationId: id,
          userId,
          action: action || `Avanço de etapa: ${fromStep || s.step} -> ${data.step}`,
          step: data.step,
          notes,
        },
      });
      return tx.solicitation.findUniqueOrThrow({ where: { id }, include: SOLICITATION_INCLUDE });
    });

    // Avisa quem criou a solicitação quando o status ou a etapa mudou
    if (s.status !== updated.status || s.step !== updated.step) {
      await notificationService.solicitationStatusChanged({
        solicitationId: id,
        contractName: updated.contract.name,
        creatorId: updated.createdById,
        status: updated.status,
        step: updated.step,
      });
    }

    return formatSolicitation(updated);
  }

  async revertStep(
    user: AccessUser,
    id: string,
    data: { currentStep: string; previousStep: string; notes?: string },
  ) {
    return this.updateStep(user, id, {
      step: data.previousStep,
      status: "aguardando_revisao",
      fromStep: data.currentStep,
      action: `Reversão de etapa: ${data.currentStep} -> ${data.previousStep}`,
      notes: data.notes,
    });
  }

  /** Só admin e super_admin apagam, e só solicitações rejeitadas (como na policy de DELETE do Supabase). */
  async deleteSolicitation(user: AccessUser, id: string) {
    if (!accessService.isAdmin(user)) {
      throw new AppError(403, "Somente administradores podem excluir solicitações.");
    }
    const s = await this.findAccessible(user, id);
    if (!DELETABLE_STATUSES.includes(s.status)) {
      throw new AppError(409, "Só é possível excluir solicitações rejeitadas.");
    }
    // O status entra no filtro: se mudou depois da leitura, não apaga
    const result = await prisma.solicitation.deleteMany({ where: { id, status: { in: DELETABLE_STATUSES } } });
    if (result.count === 0) {
      throw new AppError(409, "O status da solicitação foi alterado. Atualize a página e tente de novo.");
    }
    return { id, deleted: true };
  }

  async getHistory(user: AccessUser, id: string) {
    await this.findAccessible(user, id);
    const history = await prisma.solicitationHistory.findMany({
      where: { solicitationId: id },
      include: HISTORY_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return history.map(formatHistory);
  }

  async addHistory(
    user: AccessUser,
    id: string,
    data: { action: string; notes?: string; details?: string | null; toStep?: string | null },
  ) {
    await this.findAccessible(user, id);
    if (typeof data?.action !== "string" || !data.action || data.action.length > 200) {
      throw new AppError(400, "A ação é obrigatória (até 200 caracteres).");
    }
    const notes = optionalText(data.notes, "Observação") ?? optionalText(data.details, "Observação");
    const step = optionalText(data.toStep, "Etapa", 100);
    const entry = await prisma.solicitationHistory.create({
      data: {
        solicitationId: id,
        userId: user.userId,
        action: data.action,
        // O front envia `details` e `toStep` (formato do Supabase); aceitamos os dois nomes
        step,
        notes,
      },
      include: HISTORY_INCLUDE,
    });
    return formatHistory(entry);
  }
}

export const solicitationService = new SolicitationService();
