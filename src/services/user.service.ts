import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../utils/password.js";
import { AppError } from "../middlewares/error.middleware.js";
import type { AppRole } from "@prisma/client";

export class UserService {
  /**
   * Lista usuários com filtros opcionais
   */
  async listUsers(params?: { role?: string; regionalId?: string; search?: string }) {
    const where: any = {};

    if (params?.role) {
      where.role = params.role as AppRole;
    }

    if (params?.regionalId) {
      where.regionals = {
        some: { regionalId: params.regionalId },
      };
    }

    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
        { department: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        cargo: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        isBlocked: true,
        lastLoginAt: true,
        createdAt: true,
        regionals: {
          select: {
            regionalId: true,
            regional: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        contracts: {
          select: {
            contractId: true,
            contract: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return users.map((u) => ({
      ...u,
      regional_ids: u.regionals.map((r) => r.regionalId),
      regionals: u.regionals.map((r) => r.regional),
      contract_ids: u.contracts.map((c) => c.contractId),
      contracts: u.contracts.map((c) => c.contract),
    }));
  }

  /**
   * Lista usuários para menção (@user)
   */
  async listMentionable() {
    return prisma.user.findMany({
      where: { isActive: true, isBlocked: false },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        avatarUrl: true,
        role: true,
      },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Obtém detalhes de um usuário por ID
   */
  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        regionals: {
          include: { regional: true },
        },
        contracts: {
          include: { contract: true },
        },
      },
    });

    if (!user) {
      throw new AppError(404, "Usuário não encontrado.");
    }

    const { passwordHash, ...safeUser } = user;
    return {
      ...safeUser,
      regional_ids: user.regionals.map((r) => r.regionalId),
      regionals: user.regionals.map((r) => r.regional),
      contract_ids: user.contracts.map((c) => c.contractId),
      contracts: user.contracts.map((c) => c.contract),
    };
  }

  /**
   * Cria novo usuário (administrador)
   */
  async createUser(data: {
    email: string;
    password?: string;
    name: string;
    role?: AppRole;
    department?: string;
    cargo?: string;
    phone?: string;
    regionalIds?: string[];
    contractIds?: string[];
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError(400, "Já existe um usuário cadastrado com este e-mail.");
    }

    const initialPassword = data.password || "Gps@123456";
    const passwordHash = await hashPassword(initialPassword);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        role: data.role || "colaborador",
        department: data.department,
        cargo: data.cargo,
        phone: data.phone,
        regionals: data.regionalIds
          ? {
              create: data.regionalIds.map((regId) => ({ regionalId: regId })),
            }
          : undefined,
        contracts: data.contractIds
          ? {
              create: data.contractIds.map((cId) => ({ contractId: cId })),
            }
          : undefined,
      },
    });

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Atualiza dados de um usuário
   */
  async updateUser(
    id: string,
    data: {
      name?: string;
      email?: string;
      role?: AppRole;
      department?: string;
      cargo?: string;
      phone?: string;
      isActive?: boolean;
      regionalIds?: string[];
      contractIds?: string[];
    },
  ) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError(404, "Usuário não encontrado.");
    }

    if (data.email && data.email !== user.email) {
      const emailExists = await prisma.user.findUnique({ where: { email: data.email } });
      if (emailExists) {
        throw new AppError(400, "E-mail já utilizado por outro usuário.");
      }
    }

    // Se forneceu regionalIds, sincroniza
    if (data.regionalIds) {
      await prisma.userRegional.deleteMany({ where: { userId: id } });
      await prisma.userRegional.createMany({
        data: data.regionalIds.map((regId) => ({ userId: id, regionalId: regId })),
        skipDuplicates: true,
      });
    }

    // Se forneceu contractIds, sincroniza
    if (data.contractIds) {
      await prisma.userContract.deleteMany({ where: { userId: id } });
      await prisma.userContract.createMany({
        data: data.contractIds.map((cId) => ({ userId: id, contractId: cId })),
        skipDuplicates: true,
      });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        department: data.department,
        cargo: data.cargo,
        phone: data.phone,
        isActive: data.isActive,
      },
      include: {
        regionals: { include: { regional: true } },
        contracts: { include: { contract: true } },
      },
    });

    const { passwordHash, ...safeUser } = updated;
    return {
      ...safeUser,
      regional_ids: updated.regionals.map((r) => r.regionalId),
      regionals: updated.regionals.map((r) => r.regional),
      contract_ids: updated.contracts.map((c) => c.contractId),
      contracts: updated.contracts.map((c) => c.contract),
    };
  }

  /**
   * Bloqueia ou desbloqueia usuário
   */
  async toggleBlock(id: string, isBlocked: boolean, reason?: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError(404, "Usuário não encontrado.");
    }

    return prisma.user.update({
      where: { id },
      data: { isBlocked },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBlocked: true,
      },
    });
  }

  /**
   * Atribui regionais
   */
  async assignRegionals(userId: string, regionalIds: string[]) {
    await prisma.userRegional.deleteMany({ where: { userId } });
    if (regionalIds.length > 0) {
      await prisma.userRegional.createMany({
        data: regionalIds.map((regId) => ({ userId, regionalId: regId })),
        skipDuplicates: true,
      });
    }
    return { success: true, count: regionalIds.length };
  }

  /**
   * Atribui contratos
   */
  async assignContracts(userId: string, contractIds: string[]) {
    await prisma.userContract.deleteMany({ where: { userId } });
    if (contractIds.length > 0) {
      await prisma.userContract.createMany({
        data: contractIds.map((cId) => ({ userId, contractId: cId })),
        skipDuplicates: true,
      });
    }
    return { success: true, count: contractIds.length };
  }

  /**
   * Remove usuário do sistema
   */
  async deleteUser(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError(404, "Usuário não encontrado.");
    }

    await prisma.user.delete({ where: { id } });
    return { success: true };
  }
}

export const userService = new UserService();
