import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error.middleware.js";

export class ProductService {
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
      include: {
        category: true,
        regional: true,
        supplier: true,
      },
      orderBy: { name: "asc" },
    });

    return products.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      name: p.name,
      descricao: p.descricao,
      unidade: p.unidade,
      tabela: Number(p.tabela),
      valor_unitario: Number(p.tabela),
      valorUnitario: Number(p.tabela),
      categoria: p.category?.name || "Geral",
      product_category_id: p.categoryId,
      productCategoryId: p.categoryId,
      product_category: p.category,
      regional_id: p.regionalId,
      regionalId: p.regionalId,
      regional: p.regional,
      supplier_id: p.supplierId,
      fornecedor: p.supplier?.tradeName || p.supplier?.name || null,
      image_url: p.imageUrl,
      fotoUrl: p.imageUrl,
      active: p.active,
      ativo: p.active,
      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString(),
    }));
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

    const items = products.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      name: p.name,
      descricao: p.descricao,
      unidade: p.unidade,
      tabela: Number(p.tabela),
      valor_unitario: Number(p.tabela),
      categoria: p.category?.name || "Geral",
      product_category_id: p.categoryId,
      product_category: p.category,
      regional_id: p.regionalId,
      regional: p.regional,
      fornecedor: p.supplier?.tradeName || p.supplier?.name || null,
      image_url: p.imageUrl,
      active: p.active,
      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString(),
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      // Transitório: o frontend herdado do Supabase lê estes nomes (products e totalCount)
      products: items,
      totalCount: total,
    };
  }

  /**
   * Detalhes de um produto por ID
   */
  async getProductById(id: string) {
    const p = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        regional: true,
        supplier: true,
      },
    });

    if (!p) {
      throw new AppError(404, "Produto não encontrado.");
    }

    return {
      id: p.id,
      codigo: p.codigo,
      name: p.name,
      descricao: p.descricao,
      unidade: p.unidade,
      tabela: Number(p.tabela),
      valor_unitario: Number(p.tabela),
      categoria: p.category?.name || "Geral",
      product_category_id: p.categoryId,
      regional_id: p.regionalId,
      regional: p.regional,
      supplier_id: p.supplierId,
      fornecedor: p.supplier?.tradeName || p.supplier?.name || null,
      image_url: p.imageUrl,
      active: p.active,
      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString(),
    };
  }

  /**
   * Cadastra novo produto
   */
  async createProduct(data: {
    name: string;
    codigo?: string;
    descricao?: string;
    unidade?: string;
    tabela?: number;
    categoryId?: string;
    regionalId?: string;
    supplierId?: string;
    imageUrl?: string;
  }) {
    if (!data.name?.trim()) {
      throw new AppError(400, "Nome do produto é obrigatório.");
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        codigo: data.codigo,
        descricao: data.descricao,
        unidade: data.unidade || "UN",
        tabela: data.tabela ?? 0,
        categoryId: data.categoryId,
        regionalId: data.regionalId,
        supplierId: data.supplierId,
        imageUrl: data.imageUrl,
      },
      include: {
        category: true,
        regional: true,
        supplier: true,
      },
    });

    return {
      id: product.id,
      codigo: product.codigo,
      name: product.name,
      unidade: product.unidade,
      tabela: Number(product.tabela),
      valor_unitario: Number(product.tabela),
      product_category_id: product.categoryId,
      regional_id: product.regionalId,
      active: product.active,
    };
  }

  /**
   * Atualiza produto
   */
  async updateProduct(
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
      imageUrl?: string;
      active?: boolean;
    },
  ) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "Produto não encontrado.");
    }

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
        supplierId: data.supplierId,
        imageUrl: data.imageUrl,
        active: data.active,
      },
      include: {
        category: true,
        regional: true,
        supplier: true,
      },
    });

    return {
      id: updated.id,
      codigo: updated.codigo,
      name: updated.name,
      unidade: updated.unidade,
      tabela: Number(updated.tabela),
      valor_unitario: Number(updated.tabela),
      product_category_id: updated.categoryId,
      regional_id: updated.regionalId,
      active: updated.active,
    };
  }

  /**
   * Exclusão / Desativação de produto
   */
  async deleteProduct(id: string) {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { orderItems: true },
    });
    if (!existing) {
      throw new AppError(404, "Produto não encontrado.");
    }

    if (existing.orderItems.length > 0) {
      await prisma.product.update({
        where: { id },
        data: { active: false },
      });
      return { id, deactivated: true };
    }

    await prisma.product.delete({ where: { id } });
    return { id, deleted: true };
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

    return {
      suppliers: supplierNames,
      tables,
      // Transitório: nomes que o frontend herdado do Supabase lê
      fornecedores: supplierNames,
      tabelas: tables,
      categories: categoryNames,
    };
  }

  /**
   * Índice de duplicidades
   */
  async getDuplicateIndex() {
    const products = await prisma.product.findMany({
      where: { active: true },
      select: { id: true, codigo: true, name: true },
    });

    const codeMap = new Map<string, string[]>();
    for (const p of products) {
      if (p.codigo) {
        const list = codeMap.get(p.codigo) || [];
        list.push(p.id);
        codeMap.set(p.codigo, list);
      }
    }

    const duplicates: Record<string, string[]> = {};
    for (const [code, ids] of codeMap.entries()) {
      if (ids.length > 1) {
        duplicates[code] = ids;
      }
    }

    return duplicates;
  }
}

export const productService = new ProductService();
