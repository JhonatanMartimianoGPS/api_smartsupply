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
    const where: any = {};

    if (params?.active !== undefined) where.active = params.active;
    if (params?.regionalId) {
      where.OR = [{ regionalId: params.regionalId }, { regionalId: null }];
    }
    if (params?.categoryId) where.categoryId = params.categoryId;
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { codigo: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
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
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(params.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params.active !== undefined) where.active = params.active;
    if (params.regionalId) {
      where.OR = [{ regionalId: params.regionalId }, { regionalId: null }];
    }
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.supplierId) where.supplierId = params.supplierId;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { codigo: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          category: true,
          regional: true,
          supplier: true,
        },
        orderBy: { name: "asc" },
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
      regional_id: p.regionalId,
      fornecedor: p.supplier?.tradeName || p.supplier?.name || null,
      image_url: p.imageUrl,
      active: p.active,
    }));

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
  async getFilterOptions() {
    const [suppliers, tables] = await Promise.all([
      prisma.registeredSupplier.findMany({
        where: { active: true },
        select: { id: true, name: true, tradeName: true },
      }),
      prisma.product.findMany({
        where: { active: true },
        select: { tabela: true },
        distinct: ["tabela"],
      }),
    ]);

    return {
      suppliers: suppliers.map((s) => s.tradeName || s.name),
      tables: tables.map((t) => Number(t.tabela)).filter((v) => v > 0),
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
