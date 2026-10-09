import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, TokenPayload } from "../utils/jwt.js";
import { AppRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      status_code: 401,
      message: "Token de autenticação não fornecido ou inválido",
      error: "Unauthorized",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      status_code: 401,
      message: "Sessão expirada ou token inválido. Faça login novamente.",
      error: "Unauthorized",
    });
  }
}

export function authorize(allowedRoles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        status_code: 401,
        message: "Usuário não autenticado",
        error: "Unauthorized",
      });
    }

    if (req.user.role === "super_admin") {
      return next(); // super_admin tem acesso global irrestrito
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status_code: 403,
        message: "Acesso negado: seu perfil não possui permissão para este recurso",
        error: "Forbidden",
      });
    }

    next();
  };
}
