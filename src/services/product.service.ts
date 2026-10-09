import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error.middleware.js";
import type { AccessUser } from "./access.service.js";
import { raw } from "../lib/serialize.js";

// Relações que acompanham o produto nas respostas
const PRODUCT_INCLUDE = {
  category: true,
  regional: true,
  supplier: { select: { id: true, name: true, tradeName: true } },
} as const;

// Produto no contrato da API: o modelo (com category, regional e supplier) mais dois calculados
// que as telas usam em toda parte: categoria (nome da categoria) e fornecedor (nome do fornecedor)
function withProductExtras<T extends { category?: { name: string } | null; supplier?: { name: string; tradeName: string | null } | null }>(p: T) {
  return {
    ...p,
    categoria: p.category?.name ?? "Geral",
    fornecedor: p.supplier?.tradeName || p.supplier?.name || null,
  };
}

// Texto comparável de código/nome: sem espaços duplicados e sem diferença de maiúsculas
const normalizeText = (value: string | null | undefined) => value?.trim().replace(/\s+/g, " ").toUpperCase() ?? "";

// Campos do produto guardados no histórico (como o snapshot do trigger do Supabase)
function productSnapshot(p: any) {
  return {
    id: p.id,
    codigo: p.codigo,
    name: p.name,
    descricao: p.descricao,
    unidade: p.unidade,
    tabela: Number(p.tabela),
    product_category_id: p.categoryId,
    regional_id: p.regionalId,
    supplier_id: p.supplierId,
    image_url: p.imageUrl,
    active: p.active,
  };
}

export class ProductService {
  /**
   * Confere, item a item, se os produtos de um rascunho de pedido podem entrar no contrato.
   * Mesma regra usada ao gravar o pedido (order.service prepareItems): produto ativo e da regional
   * do contrato, ou global (sem regional). Devolve o formato que o frontend lê (herdado do RPC
   * validate_contract_draft_items do Supabase).
   */
  async validateContractDraftItems(contract: { id: string; regionalId: string }, productIds: string[]) {
    const ids = [...new Set(productIds)];
    if (ids.length === 0) return [];

    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, active: true, regionalId: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    return ids.map((productId) => {
      const product = byId.get(productId);
      // Produto inativo saiu do catálogo: para o pedido é o mesmo que não existir
      const existsInCatalog = Boolean(product?.active);
      const matchesRegional = product ? product.regionalId === null || product.regionalId === contract.regionalId : false;
      const available = existsInCatalog && matchesRegional;

      let reasonCode: "ok" | "product_deleted" | "regional_mismatch" = "ok";
      let reasonMessage = "Produto disponível para este contrato.";
      if (!existsInCatalog) {
        reasonCode = "product_deleted";
        reasonMessage = "Produto removido do catálogo.";
      } else if (!matchesRegional) {
        reasonCode = "regional_mismatch";
        reasonMessage = "Produto pertence a outra regional.";
      }

      return {
        product_id: productId,
        exists_in_catalog: existsInCatalog,
        available_for_contract: available,
        // Transitório: no modelo atual a disponibilidade é por regional; o frontend só lê available_for_contract
        availability_source: available ? "direct_contract" : null,
        removed_from_catalog: !existsInCatalog,
        reason_code: reasonCode,
        reason_message: reasonMessage,
      };
    });
  }

  /**
   * Lista catálogo de produtos com filtros simples
   */
  async listProducts(params?: {
    regionalId?: string;
    categoryId?: string;
    search?: string;
    active?: boolean;
  }) {
    // Cada filtro entra em AND: o OR da busca não pode sobrescrever o OR de regional
    const and: any[] = [];

    if (params?.active !== undefined) and.push({ active: params.active });
    if (params?.regionalId) {
      and.push({ OR: [{ regionalId: params.regionalId }, { regionalId: null }] });
    }
    if (params?.categoryId) and.push({ categoryId: params.categoryId });
    if (params?.search) {
      and.push({
        OR: [
          { name: { contains: params.search, mode: "insensitive" } },
          { codigo: { contains: params.search, mode: "insensitive" } },
        ],
      });
    }

    const products = await prisma.product.findMany({
      where: and.length > 0 ? { AND: and } : {},
      include: PRODUCT_INCLUDE,
      orderBy: { name: "asc" },
    });

    return products.map(withProductExtras);
  }

  /**
   * Listagem paginada com contagem total e filtros avançados
   */
  async listPaginated(params: {
    page?: number;
    pageSize?: number;
    regionalId?: string;
    categoryId?: string;
    supplierId?: string;
    search?: string;
    active?: boolean;
    // Filtros que o frontend envia (herdados do Supabase)
    category?: string; // id, código ou nome da categoria
    fornecedor?: string; // nome do fornecedor
    tabela?: number; // valor de tabela do produto
    productIds?: string[];
    sort?: string;
  }) {
    // Número de página seguro: "1e20" ou valores enormes estourariam o skip do Prisma
    const rawPage = Math.floor(Number(params.page));
    const page = Number.isFinite(rawPage) ? Math.min(Math.max(1, rawPage), 100000) : 1;
    const pageSize = Math.max(1, Math.min(100, Math.floor(Number(params.pageSize)) || 20));
    const skip = (page - 1) * pageSize;

    // Cada filtro entra em AND: um OR de busca não pode sobrescrever o OR de regional
    const and: any[] = [];
    // Produto desativado (apagado, mas com pedidos) não aparece no catálogo
    and.push({ active: params.active ?? true });

    // Produto da regional ou global (sem regional)
    if (params.regionalId) and.push({ OR: [{ regionalId: params.regionalId }, { regionalId: null }] });

    if (params.categoryId) and.push({ categoryId: params.categoryId });
    if (params.category) {
      and.push({
        OR: [
          { categoryId: params.category },
          { category: { code: params.category } },
          { category: { name: { equals: params.category, mode: "insensitive" } } },
        ],
      });
    }
    if (params.supplierId) and.push({ supplierId: params.supplierId });
    if (params.fornecedor) {
      and.push({
        supplier: {
          OR: [
            { name: { equals: params.fornecedor, mode: "insensitive" } },
            { tradeName: { equals: params.fornecedor, mode: "insensitive" } },
          ],
        },
      });
    }
    if (params.tabela !== undefined && Number.isFinite(params.tabela)) and.push({ tabela: params.tabela });
    if (params.productIds?.length) and.push({ id: { in: params.productIds } });
    if (params.search) {
      and.push({
        OR: [
          { name: { contains: params.search, mode: "insensitive" } },
          { codigo: { contains: params.search, mode: "insensitive" } },
        ],
      });
    }
    const where = and.length > 0 ? { AND: and } : {};

    const sortOptions: Record<string, any> = {
      "name-asc": { name: "asc" },
      "name-desc": { name: "desc" },
      "price-asc": { tabela: "asc" },
      "price-desc": { tabela: "desc" },
      "date-asc": { createdAt: "asc" },
      "date-desc": { createdAt: "desc" },
    };
    // hasOwn: "constructor" ou "toString" não podem virar ordenação
    const orderBy = params.sort && Object.hasOwn(sortOptions, params.sort) ? sortOptions[params.sort] : sortOptions["name-asc"];

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          category: { select: { id: true, name: true, code: true } },
          regional: { select: { id: true, name: true, code: true } },
          supplier: { select: { name: true, tradeName: true } },
        },
        orderBy,
      }),
    ]);

    const items = products.map(withProductExtras);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Detalhes de um produto por ID
   */
  async getProductById(id: string) {
    const p = await prisma.product.findUnique({
      where: { id },
      include: PRODUCT_INCLUDE,
    });

    if (!p) {
      throw new AppError(404, "Produto não encontrado.");
    }

    return withProductExtras(p);
  }

  /**
   * Cadastra novo produto
   */
  /** A tela de produto ainda informa o fornecedor pelo nome: usamos o cadastrado com esse nome, se houver. */
  private async resolveSupplierId(data: { supplierId?: string | null; fornecedor?: string | null }) {
    if (data.supplierId) return data.supplierId;
    const name = data.fornecedor?.trim();
    if (!name) return undefined;
    const supplier = await prisma.registeredSupplier.findFirst({
      where: { OR: [{ name: { equals: name, mode: "insensitive" } }, { tradeName: { equals: name, mode: "insensitive" } }] },
      select: { id: true },
    });
    return supplier?.id;
  }

  async createProduct(user: AccessUser, data: {
    name: string;
    codigo?: string;
    descricao?: string;
    unidade?: string;
    tabela?: number;
    categoryId?: string;
    regionalId?: string;
    supplierId?: string;
    fornecedor?: string | null;
    imageUrl?: string;
  }) {
    if (!data.name?.trim()) {
      throw new AppError(400, "Nome do produto é obrigatório.");
    }
    const supplierId = await this.resolveSupplierId(data);

    const product = await prisma.product.create({
      data: {
        name: data.name,
        codigo: data.codigo,
        descricao: data.descricao,
        unidade: data.unidade || "UN",
        tabela: data.tabela ?? 0,
        categoryId: data.categoryId,
        regionalId: data.regionalId,
        supplierId,
        imageUrl: data.imageUrl,
      },
      include: PRODUCT_INCLUDE,
    });
    await this.recordHistory("created", product, user.userId, { snapshot: productSnapshot(product) });

    return withProductExtras(product);
  }

  /**
   * Atualiza produto
   */
  async updateProduct(
    user: AccessUser,
    id: string,
    data: {
      name?: string;
      codigo?: string;
      descricao?: string;
      unidade?: string;
      tabela?: number;
      categoryId?: string;
      regionalId?: string;
      supplierId?: string;
      fornecedor?: string | null;
      imageUrl?: string;
      active?: boolean;
    },
  ) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "Produto não encontrado.");
    }
    const supplierId = data.supplierId !== undefined || data.fornecedor !== undefined ? await this.resolveSupplierId(data) : undefined;

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        codigo: data.codigo,
        descricao: data.descricao,
        unidade: data.unidade,
        tabela: data.tabela !== undefined ? data.tabela : undefined,
        categoryId: data.categoryId,
        regionalId: data.regionalId,
        supplierId,
        imageUrl: data.imageUrl,
        active: data.active,
      },
      include: PRODUCT_INCLUDE,
    });
    await this.recordChange(user.userId, existing, updated);

    return withProductExtras(updated);
  }

  /**
   * Exclusão / Desativação de produto
   */
  async deleteProduct(user: AccessUser, id: string) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "Produto não encontrado.");
    }

    // Produto que já entrou em pedido não some: só é desativado (os pedidos antigos continuam íntegros)
    const usedInOrders = await prisma.orderItem.count({ where: { productId: id } });
    if (usedInOrders > 0) {
      const updated = await prisma.product.update({
        where: { id },
        data: { active: false },
      });
      await this.recordChange(user.userId, existing, updated);
      return { id, deactivated: true };
    }

    // O histórico do produto é apagado junto (chave estrangeira em cascata), como no modelo atual
    await prisma.product.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ─── Histórico ──────────────────────────────────────────────────────────────
  private async recordHistory(action: "created" | "updated", product: any, userId: string, details: any) {
    await prisma.productHistory.create({
      data: { productId: product.id, userId, action, details },
    });
  }

  /** Grava "updated" com os campos que mudaram (changed_fields é o que a tela de histórico mostra). */
  private async recordChange(userId: string, before: any, after: any) {
    const prev = productSnapshot(before);
    const next = productSnapshot(after);
    const changedFields = Object.keys(next).filter((k) => (prev as any)[k] !== (next as any)[k]);
    if (changedFields.length === 0) return;
    await this.recordHistory("updated", after, userId, { before: prev, after: next, changed_fields: changedFields });
  }

  /**
   * Histórico de alterações do catálogo, no formato que a tela lê. Sem a migration do histórico,
   * produtos excluídos levam o histórico junto; o filtro por regional usa a regional atual do produto.
   */
  async getHistory(params: { productId?: string; regionalId?: string; limit?: number }) {
    const take = Math.min(Math.max(1, Math.floor(Number(params.limit)) || 100), 500);
    const where: any = {};
    if (params.productId) where.productId = params.productId;
    if (params.regionalId) where.product = { regionalId: params.regionalId };

    const entries = await prisma.productHistory.findMany({
      where,
      include: { product: { select: { codigo: true, name: true, regionalId: true } } },
      orderBy: { createdAt: "desc" },
      take,
    });
    const userIds = [...new Set(entries.map((e) => e.userId).filter((u): u is string => Boolean(u)))];
    const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [];
    const names = new Map(users.map((u) => [u.id, u.name]));

    return entries.map((e) => {
      const details: any = e.details ?? {};
      const snap = details.after ?? details.snapshot ?? {};
      return {
        id: e.id,
        product_id: e.productId,
        regional_id: e.product?.regionalId ?? snap.regional_id ?? null,
        actor_user_id: e.userId,
        action: e.action,
        product_codigo: e.product?.codigo ?? snap.codigo ?? null,
        product_name: e.product?.name ?? snap.name ?? null,
        details: e.details,
        created_at: e.createdAt.toISOString(),
        actor_profile: e.userId ? { full_name: names.get(e.userId) ?? "Usuário" } : undefined,
      };
    });
  }

  // ─── Import de planilha ─────────────────────────────────────────────────────
  /** Produtos ativos da regional (e os globais), com o nome do fornecedor, para casar com a planilha. */
  private async catalogForImport(regionalId?: string | null) {
    return prisma.product.findMany({
      where: {
        active: true,
        codigo: { not: null },
        ...(regionalId ? { OR: [{ regionalId }, { regionalId: null }] } : {}),
      },
      select: { id: true, codigo: true, tabela: true, supplier: { select: { name: true } } },
    });
  }

  /** Para cada linha da planilha, os produtos existentes com o mesmo código (a tela decide pelo fornecedor). */
  async importLookup(rows: { lookupIndex: number; codigo: string }[], regionalId?: string | null) {
    if (rows.length === 0) return {};
    const catalog = await this.catalogForImport(regionalId);
    const byCode = new Map<string, { id: string; codigo: string; tabela: number; fornecedor: string | null }[]>();
    for (const p of catalog) {
      const key = normalizeText(p.codigo);
      const list = byCode.get(key) ?? [];
      list.push({ id: p.id, codigo: p.codigo ?? "", tabela: Number(p.tabela), fornecedor: p.supplier?.name ?? null });
      byCode.set(key, list);
    }
    const result: Record<number, unknown[]> = {};
    for (const row of rows) {
      result[row.lookupIndex] = byCode.get(normalizeText(row.codigo)) ?? [];
    }
    return raw(result);
  }

  /** Quantos produtos já existem com cada código (na regional), para avisar duplicidade no import. */
  async importDuplicateLookup(codes: string[], regionalId?: string | null) {
    if (codes.length === 0) return {};
    const catalog = await this.catalogForImport(regionalId);
    const counts = new Map<string, number>();
    for (const p of catalog) {
      const key = normalizeText(p.codigo);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    // Chave pelo código como veio e pela forma normalizada (a tela usa a normalizada)
    const result: Record<string, number> = {};
    for (const code of codes) {
      const n = counts.get(normalizeText(code)) ?? 0;
      result[code] = n;
      result[normalizeText(code)] = n;
    }
    return raw(result);
  }

  // ─── Disponibilidade (modelo atual: produto é da regional; categorias ligadas por vínculo) ───
  /** Categorias de contrato em que o produto entra: as ligadas à categoria de produto dele. */
  async getCategoryMap(productIds?: string[]) {
    const products = await prisma.product.findMany({
      where: productIds ? { id: { in: productIds } } : { active: true },
      select: { id: true, categoryId: true },
    });
    const categoryIds = [...new Set(products.map((p) => p.categoryId).filter((c): c is string => Boolean(c)))];
    const links = categoryIds.length
      ? await prisma.contractCategoryProductCategoryLink.findMany({ where: { productCategoryId: { in: categoryIds } } })
      : [];
    const byProductCategory = new Map<string, string[]>();
    for (const l of links) {
      const list = byProductCategory.get(l.productCategoryId) ?? [];
      list.push(l.contractCategoryId);
      byProductCategory.set(l.productCategoryId, list);
    }
    const map: Record<string, string[]> = {};
    for (const p of products) {
      map[p.id] = p.categoryId ? (byProductCategory.get(p.categoryId) ?? []) : [];
    }
    return raw(map);
  }

  async getProductContractCategoryIds(productId: string) {
    const map = (await this.getCategoryMap([productId])).value as Record<string, string[]>;
    if (!(productId in map)) {
      throw new AppError(404, "Produto não encontrado.");
    }
    return map[productId];
  }

  /** Contratos em que o produto entra: os ativos da regional dele; produto global entra em todos. */
  async getContractMap(productIds?: string[]) {
    const products = await prisma.product.findMany({
      where: productIds ? { id: { in: productIds } } : { active: true },
      select: { id: true, regionalId: true },
    });
    const contracts = await prisma.contract.findMany({ where: { active: true }, select: { id: true, regionalId: true } });
    const byRegional = new Map<string, string[]>();
    for (const c of contracts) {
      const list = byRegional.get(c.regionalId) ?? [];
      list.push(c.id);
      byRegional.set(c.regionalId, list);
    }
    const all = contracts.map((c) => c.id);
    const map: Record<string, string[]> = {};
    for (const p of products) {
      map[p.id] = p.regionalId ? (byRegional.get(p.regionalId) ?? []) : all;
    }
    return raw(map);
  }

  async getContractCategoryLinks(contractCategoryIds: string[], productCategoryIds: string[]) {
    if (contractCategoryIds.length === 0 || productCategoryIds.length === 0) return [];
    return prisma.contractCategoryProductCategoryLink.findMany({
      where: { contractCategoryId: { in: contractCategoryIds }, productCategoryId: { in: productCategoryIds } },
    });
  }

  private async findLinkPair(contractCategoryId: string, productCategoryId: string) {
    const [contractCategory, productCategory] = await Promise.all([
      prisma.contractCategory.findUnique({ where: { id: contractCategoryId }, select: { id: true } }),
      prisma.productCategory.findUnique({ where: { id: productCategoryId }, select: { id: true, name: true } }),
    ]);
    if (!contractCategory || !productCategory) {
      throw new AppError(404, "Categoria de contrato ou categoria de produto não encontrada.");
    }
    const affectedProducts = await prisma.product.count({ where: { categoryId: productCategoryId, active: true } });
    return { productCategory, affectedProducts };
  }

  /** Vincula uma categoria de produto a uma categoria de contrato (vale para todos os produtos dela). */
  async bulkAssignContractCategory(contractCategoryId: string, productCategoryId: string) {
    const { productCategory, affectedProducts } = await this.findLinkPair(contractCategoryId, productCategoryId);
    const existing = await prisma.contractCategoryProductCategoryLink.findUnique({
      where: { contractCategoryId_productCategoryId: { contractCategoryId, productCategoryId } },
    });
    if (!existing) {
      await prisma.contractCategoryProductCategoryLink.create({ data: { contractCategoryId, productCategoryId } });
    }
    return {
      mappingCreated: !existing,
      affectedProducts,
      insertedAvailability: existing ? 0 : affectedProducts,
      productCategoryName: productCategory.name,
    };
  }

  async bulkRemoveContractCategory(contractCategoryId: string, productCategoryId: string) {
    const { productCategory, affectedProducts } = await this.findLinkPair(contractCategoryId, productCategoryId);
    const removed = await prisma.contractCategoryProductCategoryLink.deleteMany({ where: { contractCategoryId, productCategoryId } });
    return {
      affectedProducts,
      removedAvailability: removed.count > 0 ? affectedProducts : 0,
      productCategoryName: productCategory.name,
    };
  }

  /**
   * Define quais produtos pertencem a uma categoria de produto: os informados entram nela; os que
   * estavam nela e não foram informados vão para a categoria de destino (ou ficam sem categoria).
   */
  async syncProductsForCategory(
    user: AccessUser,
    categoryId: string,
    data: { productIds: string[]; regionalId?: string | null; fallbackCategoryId?: string | null },
  ) {
    const category = await prisma.productCategory.findUnique({ where: { id: categoryId }, select: { id: true } });
    if (!category) {
      throw new AppError(404, "Categoria de produto não encontrada.");
    }
    if (data.fallbackCategoryId) {
      if (data.fallbackCategoryId === categoryId) {
        throw new AppError(400, "A categoria de destino precisa ser diferente da categoria editada.");
      }
      const fallback = await prisma.productCategory.count({ where: { id: data.fallbackCategoryId } });
      if (fallback === 0) {
        throw new AppError(400, "Categoria de destino não encontrada.");
      }
    }

    const selected = new Set(data.productIds);
    const regionalWhere = data.regionalId ? { OR: [{ regionalId: data.regionalId }, { regionalId: null }] } : {};
    const [toAssign, toClear] = await Promise.all([
      // Produto sem categoria também entra: "NOT categoryId" sozinho deixaria o NULL de fora
      prisma.product.findMany({
        where: { id: { in: data.productIds }, AND: [{ OR: [{ categoryId: null }, { NOT: { categoryId } }] }, regionalWhere] },
      }),
      prisma.product.findMany({ where: { categoryId, id: { notIn: data.productIds }, ...regionalWhere } }),
    ]);

    let historyEventsCount = 0;
    await prisma.$transaction(async (tx) => {
      for (const p of toAssign) {
        const updated = await tx.product.update({ where: { id: p.id }, data: { categoryId } });
        await tx.productHistory.create({
          data: {
            productId: p.id,
            userId: user.userId,
            action: "updated",
            details: { before: productSnapshot(p), after: productSnapshot(updated), changed_fields: ["product_category_id"] },
          },
        });
        historyEventsCount++;
      }
      for (const p of toClear) {
        const updated = await tx.product.update({ where: { id: p.id }, data: { categoryId: data.fallbackCategoryId ?? null } });
        await tx.productHistory.create({
          data: {
            productId: p.id,
            userId: user.userId,
            action: "updated",
            details: { before: productSnapshot(p), after: productSnapshot(updated), changed_fields: ["product_category_id"] },
          },
        });
        historyEventsCount++;
      }
    });

    void selected;
    return { updatedCount: toAssign.length, clearedCount: toClear.length, historyEventsCount };
  }

  /**
   * Opções distintas para filtros de catálogo
   */
  async getFilterOptions(params: { regionalId?: string } = {}) {
    // Opções vindas dos produtos ativos da regional (e globais), para o filtro nunca mostrar opção vazia
    const inScope: any = { active: true };
    if (params.regionalId) inScope.OR = [{ regionalId: params.regionalId }, { regionalId: null }];

    const [suppliers, prices, categories] = await Promise.all([
      prisma.registeredSupplier.findMany({
        where: { products: { some: inScope } },
        select: { name: true, tradeName: true },
      }),
      prisma.product.groupBy({ by: ["tabela"], where: inScope, orderBy: { tabela: "asc" } }),
      prisma.productCategory.findMany({
        where: { products: { some: inScope } },
        select: { name: true },
      }),
    ]);

    // Sem repetidos (a tela usa o valor como chave) e na ordem alfabética do português
    const unique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const supplierNames = unique(suppliers.map((s) => s.tradeName || s.name));
    const tables = prices.map((p) => Number(p.tabela)).filter((v) => v > 0);
    const categoryNames = unique(categories.map((c) => c.name));

    return { suppliers: supplierNames, tables, categories: categoryNames };
  }

  /**
   * Índice de duplicidades
   */
  /**
   * Produtos repetidos (mesmo código ou mesmo nome) dentro da mesma regional, no formato que a
   * Tabela de Preços lê. O mesmo código em regionais diferentes não é duplicidade.
   */
  async getDuplicateIndex(mode: "codigo" | "nome" = "codigo") {
    const products = await prisma.product.findMany({
      where: { active: true },
      select: { id: true, codigo: true, name: true, regionalId: true },
    });

    const groups = new Map<string, string[]>();
    for (const p of products) {
      const value = normalizeText(mode === "nome" ? p.name : p.codigo);
      if (!value) continue;
      const key = `${p.regionalId ?? "global"}::${value}`;
      const list = groups.get(key) ?? [];
      list.push(p.id);
      groups.set(key, list);
    }

    const duplicateCountByProductId: Record<string, number> = {};
    let duplicateGroupCount = 0;
    for (const ids of groups.values()) {
      if (ids.length < 2) continue;
      duplicateGroupCount++;
      for (const id of ids) duplicateCountByProductId[id] = ids.length;
    }
    const duplicateProductIds = Object.keys(duplicateCountByProductId);
    return { duplicateProductIds, duplicateCountByProductId, duplicateGroupCount, duplicateProductCount: duplicateProductIds.length };
  }
}

export const productService = new ProductService();
