import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error.middleware.js";

export class CategoryService {
  // ─── Categorias de Produtos ────────────────────────────────────────────────
  async listProductCategories(params?: { active?: boolean }) {
    return prisma.productCategory.findMany({
      where: params?.active !== undefined ? { active: params.active } : undefined,
      orderBy: { name: "asc" },
    });
  }

  async createProductCategory(data: { name: string; code?: string; icon?: string; description?: string }) {
    return prisma.productCategory.create({ data });
  }

  async updateProductCategory(
    id: string,
    data: { name?: string; code?: string; icon?: string; description?: string; active?: boolean },
  ) {
    const existing = await prisma.productCategory.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "Categoria de produto não encontrada.");
    }
    return prisma.productCategory.update({ where: { id }, data });
  }

  async deleteProductCategory(id: string) {
    const existing = await prisma.productCategory.findUnique({
      where: { id },
      include: { products: true },
    });
    if (!existing) {
      throw new AppError(404, "Categoria de produto não encontrada.");
    }
    if (existing.products.length > 0) {
      return prisma.productCategory.update({ where: { id }, data: { active: false } });
    }
    return prisma.productCategory.delete({ where: { id } });
  }

  // ─── Categorias de Contratos ───────────────────────────────────────────────
  async listContractCategories(params?: { regionalId?: string; active?: boolean }) {
    const where: any = {};
    if (params?.active !== undefined) where.active = params.active;
    if (params?.regionalId) where.regionalId = params.regionalId;

    return prisma.contractCategory.findMany({
      where,
      include: { regional: true },
      orderBy: { name: "asc" },
    });
  }

  async createContractCategory(data: { name: string; color?: string; regionalId?: string }) {
    return prisma.contractCategory.create({
      data,
      include: { regional: true },
    });
  }

  async updateContractCategory(
    id: string,
    data: { name?: string; color?: string; regionalId?: string; active?: boolean },
  ) {
    const existing = await prisma.contractCategory.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "Categoria de contrato não encontrada.");
    }
    return prisma.contractCategory.update({
      where: { id },
      data,
      include: { regional: true },
    });
  }

  async deleteContractCategory(id: string) {
    const existing = await prisma.contractCategory.findUnique({
      where: { id },
      include: { contracts: true },
    });
    if (!existing) {
      throw new AppError(404, "Categoria de contrato não encontrada.");
    }
    if (existing.contracts.length > 0) {
      return prisma.contractCategory.update({ where: { id }, data: { active: false } });
    }
    return prisma.contractCategory.delete({ where: { id } });
  }

  async syncContracts(categoryId: string, data: { regionalId?: string; contractIds: string[] }) {
    // Desvincula contratos anteriores dessa categoria na mesma regional (se regionalId fornecida)
    await prisma.contract.updateMany({
      where: {
        categoryId,
        ...(data.regionalId ? { regionalId: data.regionalId } : {}),
      },
      data: { categoryId: null },
    });

    // Vincula os novos contratos
    if (data.contractIds.length > 0) {
      await prisma.contract.updateMany({
        where: { id: { in: data.contractIds } },
        data: { categoryId },
      });
    }

    return { assignedCount: data.contractIds.length, clearedCount: 0 };
  }
}

export const categoryService = new CategoryService();
