import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error.middleware.js";

export class SupplierService {
  async listSuppliers(params?: { active?: boolean; search?: string }) {
    const where: any = {};
    if (params?.active !== undefined) where.active = params.active;
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { tradeName: { contains: params.search, mode: "insensitive" } },
        { razaoSocial: { contains: params.search, mode: "insensitive" } },
        { cnpj: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const suppliers = await prisma.registeredSupplier.findMany({
      where,
      include: {
        regionals: { include: { regional: true } },
        _count: { select: { products: true } },
      },
      orderBy: { name: "asc" },
    });

    return suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      tradeName: s.tradeName,
      razao_social: s.razaoSocial,
      cnpj: s.cnpj,
      email: s.email,
      phone: s.phone || s.telefone,
      telefone: s.telefone || s.phone,
      contato_nome: s.contatoNome,
      observacoes: s.observacoes,
      active: s.active,
      is_active: s.active,
      productsCount: s._count.products,
      serviceRegionals: s.regionals.map((r) => ({
        id: r.id,
        supplierId: r.supplierId,
        regionalId: r.regionalId,
        regional: r.regional,
        minOrderValue: r.minOrderValue ? Number(r.minOrderValue) : null,
        deliveryLeadTimeDays: r.deliveryLeadTimeDays,
        freeShippingThreshold: r.freeShippingThreshold ? Number(r.freeShippingThreshold) : null,
        active: r.active,
        createdAt: r.createdAt.toISOString(),
      })),
      created_at: s.createdAt.toISOString(),
      updated_at: s.updatedAt.toISOString(),
    }));
  }

  async getSupplierById(id: string) {
    const s = await prisma.registeredSupplier.findUnique({
      where: { id },
      include: {
        regionals: { include: { regional: true } },
        _count: { select: { products: true } },
      },
    });

    if (!s) {
      throw new AppError(404, "Fornecedor não encontrado.");
    }

    return {
      id: s.id,
      name: s.name,
      tradeName: s.tradeName,
      razao_social: s.razaoSocial,
      cnpj: s.cnpj,
      email: s.email,
      phone: s.phone,
      telefone: s.telefone,
      contato_nome: s.contatoNome,
      observacoes: s.observacoes,
      active: s.active,
      productsCount: s._count.products,
      serviceRegionals: s.regionals.map((r) => ({
        id: r.id,
        supplierId: r.supplierId,
        regionalId: r.regionalId,
        regional: r.regional,
        minOrderValue: r.minOrderValue ? Number(r.minOrderValue) : null,
        deliveryLeadTimeDays: r.deliveryLeadTimeDays,
        freeShippingThreshold: r.freeShippingThreshold ? Number(r.freeShippingThreshold) : null,
        active: r.active,
        createdAt: r.createdAt.toISOString(),
      })),
      created_at: s.createdAt.toISOString(),
      updated_at: s.updatedAt.toISOString(),
    };
  }

  async createSupplier(data: {
    name: string;
    tradeName?: string;
    razao_social?: string;
    cnpj?: string;
    email?: string;
    phone?: string;
    telefone?: string;
    contato_nome?: string;
    observacoes?: string;
    serviceRegionals?: Array<{
      regionalId: string;
      minOrderValue?: number;
      deliveryLeadTimeDays?: number;
      freeShippingThreshold?: number;
    }>;
  }) {
    if (data.cnpj) {
      const exists = await prisma.registeredSupplier.findUnique({ where: { cnpj: data.cnpj } });
      if (exists) {
        throw new AppError(400, "Fornecedor com este CNPJ já cadastrado.");
      }
    }

    const supplier = await prisma.registeredSupplier.create({
      data: {
        name: data.name,
        tradeName: data.tradeName,
        razaoSocial: data.razao_social,
        cnpj: data.cnpj,
        email: data.email,
        phone: data.phone || data.telefone,
        telefone: data.telefone || data.phone,
        contatoNome: data.contato_nome,
        observacoes: data.observacoes,
        regionals: data.serviceRegionals
          ? {
              create: data.serviceRegionals.map((sr) => ({
                regionalId: sr.regionalId,
                minOrderValue: sr.minOrderValue,
                deliveryLeadTimeDays: sr.deliveryLeadTimeDays,
                freeShippingThreshold: sr.freeShippingThreshold,
              })),
            }
          : undefined,
      },
    });

    return supplier;
  }

  async updateSupplier(
    id: string,
    data: {
      name?: string;
      tradeName?: string;
      razao_social?: string;
      cnpj?: string;
      email?: string;
      phone?: string;
      telefone?: string;
      contato_nome?: string;
      observacoes?: string;
      active?: boolean;
      serviceRegionals?: Array<{
        regionalId: string;
        minOrderValue?: number;
        deliveryLeadTimeDays?: number;
        freeShippingThreshold?: number;
      }>;
    },
  ) {
    const existing = await prisma.registeredSupplier.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "Fornecedor não encontrado.");
    }

    if (data.serviceRegionals) {
      await prisma.supplierRegional.deleteMany({ where: { supplierId: id } });
      await prisma.supplierRegional.createMany({
        data: data.serviceRegionals.map((sr) => ({
          supplierId: id,
          regionalId: sr.regionalId,
          minOrderValue: sr.minOrderValue,
          deliveryLeadTimeDays: sr.deliveryLeadTimeDays,
          freeShippingThreshold: sr.freeShippingThreshold,
        })),
      });
    }

    const updated = await prisma.registeredSupplier.update({
      where: { id },
      data: {
        name: data.name,
        tradeName: data.tradeName,
        razaoSocial: data.razao_social,
        cnpj: data.cnpj,
        email: data.email,
        phone: data.phone || data.telefone,
        telefone: data.telefone || data.phone,
        contatoNome: data.contato_nome,
        observacoes: data.observacoes,
        active: data.active,
      },
    });

    return updated;
  }

  async deleteSupplier(id: string) {
    const existing = await prisma.registeredSupplier.findUnique({
      where: { id },
      include: { products: true },
    });
    if (!existing) {
      throw new AppError(404, "Fornecedor não encontrado.");
    }

    if (existing.products.length > 0) {
      await prisma.registeredSupplier.update({
        where: { id },
        data: { active: false },
      });
      return { id, deactivated: true };
    }

    await prisma.registeredSupplier.delete({ where: { id } });
    return { id, deleted: true };
  }

  async mergeSuppliers(targetSupplierId: string, duplicateSupplierIds: string[]) {
    // Migra todos os produtos dos fornecedores duplicados para o fornecedor principal
    await prisma.product.updateMany({
      where: { supplierId: { in: duplicateSupplierIds } },
      data: { supplierId: targetSupplierId },
    });

    // Desativa os fornecedores duplicados
    await prisma.registeredSupplier.updateMany({
      where: { id: { in: duplicateSupplierIds } },
      data: { active: false },
    });

    return { success: true, targetSupplierId, mergedCount: duplicateSupplierIds.length };
  }

  async getConsolidatedOrders(supplierId: string) {
    // Retorna pedidos vinculados a produtos deste fornecedor
    const products = await prisma.product.findMany({
      where: { supplierId },
      select: { id: true },
    });

    const productIds = products.map((p) => p.id);

    const items = await prisma.orderItem.findMany({
      where: { productId: { in: productIds } },
      include: {
        order: {
          include: { contract: true },
        },
      },
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    return items.map((it) => ({
      orderId: it.orderId,
      contractName: it.order.contract.name,
      productName: it.productNameSnapshot,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      total: Number(it.unitPrice) * it.quantity,
      status: it.order.status,
      date: it.order.createdAt.toISOString(),
    }));
  }
}

export const supplierService = new SupplierService();
