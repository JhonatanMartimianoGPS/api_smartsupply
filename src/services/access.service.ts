import type { AppRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error.middleware.js";

export interface AccessUser {
  userId: string;
  role: AppRole;
}

/**
 * Regras de acesso a contratos (no Supabase isso era a função has_contract_access da RLS):
 * - super_admin: todos os contratos
 * - admin e suprimentos: todos os contratos das regionais do usuário
 * - demais perfis: só os contratos vinculados ao usuário, dentro das regionais dele
 *
 * O filtro consulta os vínculos (user_regionals e user_contracts) dentro da própria
 * consulta, a cada requisição. Assim, uma mudança de acesso vale na hora, sem esperar o
 * token expirar. Só o perfil (role) vem do token.
 */
export class AccessService {
  /** Equivalente ao is_admin() do Supabase: admin e super_admin. */
  isAdmin(user: AccessUser) {
    return user.role === "admin" || user.role === "super_admin";
  }

  /** Equivalente ao is_suprimentos() do Supabase: suprimentos e admin. */
  isSuprimentos(user: AccessUser) {
    return user.role === "suprimentos" || this.isAdmin(user);
  }

  /**
   * Filtro do Prisma para a tabela de contratos. Serve para listagens:
   * prisma.order.findMany({ where: { contract: accessService.contractFilter(user) } })
   */
  contractFilter(user: AccessUser) {
    if (user.role === "super_admin") {
      return {};
    }

    const inUserRegionals = { regional: { users: { some: { userId: user.userId } } } };

    if (user.role === "admin" || user.role === "suprimentos") {
      return inUserRegionals;
    }

    return { ...inUserRegionals, users: { some: { userId: user.userId } } };
  }

  /**
   * Valida que o usuário atua na regional (super_admin: qualquer regional existente). Usado ao criar
   * ou mover um contrato. Responde 404 para não revelar regionais de outros.
   */
  async assertRegionalAccess(user: AccessUser, regionalId: string) {
    if (typeof regionalId !== "string" || !regionalId) {
      throw new AppError(400, "Regional é obrigatória.");
    }
    const regional = await prisma.regional.findFirst({
      where: user.role === "super_admin" ? { id: regionalId } : { id: regionalId, users: { some: { userId: user.userId } } },
    });
    if (!regional) {
      throw new AppError(404, "Regional não encontrada.");
    }
    return regional;
  }

  /**
   * Valida o acesso a um contrato específico e devolve o contrato. Responde 404 (e não 403)
   * para não revelar que o registro existe.
   */
  async assertContractAccess(user: AccessUser, contractId: string, notFoundMessage = "Contrato não encontrado.") {
    if (typeof contractId !== "string" || !contractId) {
      throw new AppError(400, "Contrato é obrigatório.");
    }

    const contract = await prisma.contract.findFirst({
      where: { AND: [{ id: contractId }, this.contractFilter(user)] },
    });

    if (!contract) {
      throw new AppError(404, notFoundMessage);
    }

    return contract;
  }
}

export const accessService = new AccessService();
