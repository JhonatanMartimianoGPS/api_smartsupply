import { prisma } from "../lib/prisma.js";
import { verifyPassword, hashPassword } from "../utils/password.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { CustomError } from "../middlewares/error.middleware.js";
import { auditService } from "./audit.service.js";

export class AuthService {
  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        regionals: { select: { regionalId: true } },
        contracts: { select: { contractId: true } },
      },
    });

    if (!user) {
      const error: CustomError = new Error("E-mail ou senha incorretos");
      error.statusCode = 401;
      throw error;
    }

    if (!user.isActive || user.isBlocked) {
      const error: CustomError = new Error("Esta conta está desativada ou bloqueada. Contate o administrador.");
      error.statusCode = 403;
      throw error;
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      const error: CustomError = new Error("E-mail ou senha incorretos");
      error.statusCode = 401;
      throw error;
    }

    // Atualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Trilha de auditoria (LGPD / SOX)
    void auditService.log({
      userId: user.id,
      action: "LOGIN",
      entity: "Auth",
      entityId: user.id,
      details: `Login bem-sucedido para ${user.email} (${user.role})`,
    });

    const regionalIds = user.regionals.map((r) => r.regionalId);
    const contractIds = user.contracts.map((c) => c.contractId);

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      regionals: regionalIds,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        cargo: user.cargo,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        regionals: regionalIds,
        contracts: contractIds,
      },
    };
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        regionals: { select: { regionalId: true } },
        contracts: { select: { contractId: true } },
      },
    });

    if (!user) {
      const error: CustomError = new Error("Usuário não encontrado");
      error.statusCode = 404;
      throw error;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      cargo: user.cargo,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      regionals: user.regionals.map((r) => r.regionalId),
      contracts: user.contracts.map((c) => c.contractId),
    };
  }

  static async refreshToken(oldRefreshToken: string) {
    try {
      const payload = verifyRefreshToken(oldRefreshToken);

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          regionals: { select: { regionalId: true } },
        },
      });

      if (!user || !user.isActive || user.isBlocked) {
        const error: CustomError = new Error("Usuário inativo ou não encontrado");
        error.statusCode = 401;
        throw error;
      }

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        regionals: user.regionals.map((r) => r.regionalId),
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      return { accessToken, refreshToken };
    } catch (err) {
      const error: CustomError = new Error("Refresh token inválido ou expirado");
      error.statusCode = 401;
      throw error;
    }
  }

  static async changePassword(userId: string, currentPass: string, newPass: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      const error: CustomError = new Error("Usuário não encontrado");
      error.statusCode = 404;
      throw error;
    }

    const isValid = await verifyPassword(currentPass, user.passwordHash);
    if (!isValid) {
      const error: CustomError = new Error("A senha atual informada está incorreta");
      error.statusCode = 400;
      throw error;
    }

    if (newPass.length < 6) {
      const error: CustomError = new Error("A nova senha deve ter no mínimo 6 caracteres");
      error.statusCode = 400;
      throw error;
    }

    const newHash = await hashPassword(newPass);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { success: true, message: "Senha alterada com sucesso" };
  }
}
