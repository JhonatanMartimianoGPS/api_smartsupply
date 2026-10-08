import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error.middleware.js";

export class RegionalService {
  async list(activeOnly?: boolean) {
    return prisma.regional.findMany({
      where: activeOnly !== undefined ? { active: activeOnly } : undefined,
      orderBy: { name: "asc" },
    });
  }

  async getById(id: string) {
    const regional = await prisma.regional.findUnique({
      where: { id },
      include: {
        contracts: { where: { active: true } },
      },
    });
    if (!regional) {
      throw new AppError(404, "Regional não encontrada.");
    }
    return regional;
  }

  async create(data: { name: string; code?: string; externalKey?: string }) {
    if (data.code) {
      const exists = await prisma.regional.findUnique({ where: { code: data.code } });
      if (exists) {
        throw new AppError(400, "Código de regional já em uso.");
      }
    }
    return prisma.regional.create({ data });
  }

  async update(id: string, data: { name?: string; code?: string; active?: boolean }) {
    const regional = await prisma.regional.findUnique({ where: { id } });
    if (!regional) {
      throw new AppError(404, "Regional não encontrada.");
    }
    return prisma.regional.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    const regional = await prisma.regional.findUnique({
      where: { id },
      include: { contracts: true, products: true },
    });
    if (!regional) {
      throw new AppError(404, "Regional não encontrada.");
    }
    if (regional.contracts.length > 0 || regional.products.length > 0) {
      // Soft-delete se tiver registros atrelados
      return prisma.regional.update({
        where: { id },
        data: { active: false },
      });
    }
    return prisma.regional.delete({ where: { id } });
  }
}

export const regionalService = new RegionalService();
