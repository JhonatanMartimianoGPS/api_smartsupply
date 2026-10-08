import type { Request, Response, NextFunction } from "express";
import { systemService } from "../services/system.service.js";
import { userService } from "../services/user.service.js";
import { auditService } from "../services/audit.service.js";

// Resposta das ações administrativas no formato que a tela lê (AdminActionResult)
const actionResult = (action: string, message: string, data?: unknown) => ({ success: true, message, action, data });

export class SystemController {
  async getHealth(_req: Request, res: Response, next: NextFunction) {
    try {
      const health = await systemService.getHealth();
      res.json(health);
    } catch (error) {
      next(error);
    }
  }

  async ping(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await systemService.ping(req.query.service as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ─── Módulos do Sistema ─────────────────────────────────────────────────────
  async listModules(_req: Request, res: Response, next: NextFunction) {
    try {
      const modules = await systemService.listModules();
      res.json(modules);
    } catch (error) {
      next(error);
    }
  }

  async updateModule(req: Request, res: Response, next: NextFunction) {
    try {
      const module = await systemService.updateModule(req.user!, req.params.id as string, req.body);
      res.json(module);
    } catch (error) {
      next(error);
    }
  }

  async toggleModule(req: Request, res: Response, next: NextFunction) {
    try {
      const module = await systemService.toggleModule(req.user!, req.params.id as string, req.body.is_enabled);
      res.json(module);
    } catch (error) {
      next(error);
    }
  }

  async enableAllModules(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await systemService.enableAllModules(req.user!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ─── Ações administrativas sobre usuários ───────────────────────────────────
  async adminCreateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.adminCreateUser(req.user!, req.body);
      void auditService.log({ userId: req.user!.userId, action: "CREATE", entity: "User", entityId: user.id, details: `Usuário ${user.email} criado (${user.role}).`, req });
      res.status(201).json(actionResult("create-user", "Usuário criado com sucesso.", user));
    } catch (error) {
      next(error);
    }
  }

  async adminDeleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { targetUserId } = req.body;
      await userService.adminDeleteUser(req.user!, targetUserId);
      void auditService.log({ userId: req.user!.userId, action: "DELETE", entity: "User", entityId: targetUserId, details: "Usuário excluído.", req });
      res.json(actionResult("delete-user", "Usuário excluído com sucesso."));
    } catch (error) {
      next(error);
    }
  }

  async adminResetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { targetUserId, newPassword } = req.body;
      await userService.adminResetPassword(req.user!, targetUserId, newPassword);
      void auditService.log({ userId: req.user!.userId, action: "UPDATE", entity: "User", entityId: targetUserId, details: "Senha redefinida pelo administrador.", req });
      res.json(actionResult("reset-password", "Senha redefinida com sucesso."));
    } catch (error) {
      next(error);
    }
  }

  async adminUpdateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { targetUserId, fullName } = req.body;
      const user = await userService.adminUpdateName(req.user!, targetUserId, fullName);
      void auditService.log({ userId: req.user!.userId, action: "UPDATE", entity: "User", entityId: targetUserId, details: `Nome alterado para ${fullName}.`, req });
      res.json(actionResult("update-profile", "Nome atualizado com sucesso.", user));
    } catch (error) {
      next(error);
    }
  }

  async adminUpdateEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { targetUserId, email } = req.body;
      const user = await userService.adminUpdateEmail(req.user!, targetUserId, email);
      void auditService.log({ userId: req.user!.userId, action: "UPDATE", entity: "User", entityId: targetUserId, details: `E-mail alterado para ${email}.`, req });
      res.json(actionResult("update-email", "E-mail atualizado com sucesso.", user));
    } catch (error) {
      next(error);
    }
  }

  async adminUpdateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { targetUserId, role } = req.body;
      const user = await userService.adminUpdateRole(req.user!, targetUserId, role);
      void auditService.log({ userId: req.user!.userId, action: "UPDATE", entity: "User", entityId: targetUserId, details: `Perfil alterado para ${role}.`, req });
      res.json(actionResult("update-role", "Perfil atualizado com sucesso.", user));
    } catch (error) {
      next(error);
    }
  }

  // ─── Categorias de Módulos ──────────────────────────────────────────────────
  async listModuleCategories(_req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await systemService.listModuleCategories();
      res.json(categories);
    } catch (error) {
      next(error);
    }
  }

  async createModuleCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await systemService.createModuleCategory(req.user!, req.body);
      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  }

  async updateModuleCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await systemService.updateModuleCategory(req.user!, req.params.id as string, req.body);
      res.json(category);
    } catch (error) {
      next(error);
    }
  }

  async deleteModuleCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await systemService.deleteModuleCategory(req.user!, req.params.id as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async recordPresence(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const result = await systemService.recordPresence(userId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getActivePresences(_req: Request, res: Response, next: NextFunction) {
    try {
      const presences = await systemService.getActivePresences();
      res.json(presences);
    } catch (error) {
      next(error);
    }
  }

  async listTeamMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const members = await systemService.listTeamMembers(req.query.regionalId as string);
      res.json(members);
    } catch (error) {
      next(error);
    }
  }

  async createTeamMember(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await systemService.createTeamMember(req.body);
      res.status(201).json(member);
    } catch (error) {
      next(error);
    }
  }

  async updateTeamMember(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await systemService.updateTeamMember(req.params.id as string, req.body);
      res.json(member);
    } catch (error) {
      next(error);
    }
  }

  async deleteTeamMember(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await systemService.deleteTeamMember(req.params.id as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getMinimumClientVersion(_req: Request, res: Response, next: NextFunction) {
    try {
      const config = await systemService.getMinimumClientVersion();
      res.json(config);
    } catch (error) {
      next(error);
    }
  }
}

export const systemController = new SystemController();
