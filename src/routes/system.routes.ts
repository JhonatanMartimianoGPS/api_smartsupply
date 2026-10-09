import { Router } from "express";
import { systemController } from "../controllers/system.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { apiConvention } from "../middlewares/convention.middleware.js";
import { storageService } from "../services/storage.service.js";
import { auditService } from "../services/audit.service.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  updateSystemModuleSchema,
  toggleSystemModuleSchema,
  createSystemModuleCategorySchema,
  updateSystemModuleCategorySchema,
  adminCreateUserSchema,
  adminTargetUserSchema,
  adminResetPasswordSchema,
  adminUpdateProfileSchema,
  adminUpdateEmailSchema,
  adminUpdateRoleSchema,
} from "../schemas/system.schema.js";

const router = Router();

// Telemetria pública ou autenticada
router.get("/health", (req, res, next) => systemController.getHealth(req, res, next));
router.get("/health/ping", (req, res, next) => systemController.ping(req, res, next));

// Rotas autenticadas
router.use(authenticate);
router.use(apiConvention);

// Upload de avatar de membros da equipe
router.post(
  "/team-members/avatar",
  authorize(["super_admin", "admin"]),
  storageService.getUploadMiddleware("avatars"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ status_code: 400, message: "Nenhum arquivo enviado.", error: "Bad Request" });
    }
    const info = storageService.formatUploadResult(req.file, "avatars");
    return res.json({ url: info.url, fileName: info.fileName, size: info.size });
  },
);

// Módulos do Sistema: todos leem; só o super_admin altera
const superAdmin = authorize(["super_admin"]);
router.get("/modules", (req, res, next) => systemController.listModules(req, res, next));
router.post("/modules/enable-all", superAdmin, (req, res, next) => systemController.enableAllModules(req, res, next));
router.patch("/modules/:id", superAdmin, validate(updateSystemModuleSchema), (req, res, next) =>
  systemController.updateModule(req, res, next),
);
router.patch("/modules/:id/toggle", superAdmin, validate(toggleSystemModuleSchema), (req, res, next) =>
  systemController.toggleModule(req, res, next),
);

// Categorias de módulos
router.get("/module-categories", (req, res, next) => systemController.listModuleCategories(req, res, next));
router.post("/module-categories", superAdmin, validate(createSystemModuleCategorySchema), (req, res, next) =>
  systemController.createModuleCategory(req, res, next),
);
router.patch("/module-categories/:id", superAdmin, validate(updateSystemModuleCategorySchema), (req, res, next) =>
  systemController.updateModuleCategory(req, res, next),
);
router.delete("/module-categories/:id", superAdmin, (req, res, next) =>
  systemController.deleteModuleCategory(req, res, next),
);

// Ações administrativas sobre usuários (tela de usuários). Mesmos perfis das rotas de /users:
// admin e super_admin gerenciam; só super_admin exclui.
const userAdmins = authorize(["super_admin", "admin"]);
router.post("/admin-actions/create-user", userAdmins, validate(adminCreateUserSchema), (req, res, next) =>
  systemController.adminCreateUser(req, res, next),
);
router.post("/admin-actions/delete-user", superAdmin, validate(adminTargetUserSchema), (req, res, next) =>
  systemController.adminDeleteUser(req, res, next),
);
router.post("/admin-actions/reset-password", userAdmins, validate(adminResetPasswordSchema), (req, res, next) =>
  systemController.adminResetPassword(req, res, next),
);
router.post("/admin-actions/update-profile", userAdmins, validate(adminUpdateProfileSchema), (req, res, next) =>
  systemController.adminUpdateProfile(req, res, next),
);
router.post("/admin-actions/update-email", userAdmins, validate(adminUpdateEmailSchema), (req, res, next) =>
  systemController.adminUpdateEmail(req, res, next),
);
router.post("/admin-actions/update-role", userAdmins, validate(adminUpdateRoleSchema), (req, res, next) =>
  systemController.adminUpdateRole(req, res, next),
);

// Presença de usuários
router.post("/presence", (req, res, next) => systemController.recordPresence(req, res, next));
router.get("/presence/active", (req, res, next) => systemController.getActivePresences(req, res, next));

// Vitrine da Equipe (Team Members)
router.get("/team-members", (req, res, next) => systemController.listTeamMembers(req, res, next));
router.post("/team-members", authorize(["super_admin", "admin"]), (req, res, next) =>
  systemController.createTeamMember(req, res, next),
);
router.patch("/team-members/:id", authorize(["super_admin", "admin"]), (req, res, next) =>
  systemController.updateTeamMember(req, res, next),
);
router.delete("/team-members/:id", authorize(["super_admin", "admin"]), (req, res, next) =>
  systemController.deleteTeamMember(req, res, next),
);

// Trilha de Auditoria Corporativa (LGPD / SOX)
router.get("/audit-logs", authorize(["super_admin", "admin"]), async (req, res, next) => {
  try {
    const { entity, action, userId, startDate, endDate, limit, offset } = req.query;
    const logs = await auditService.listLogs({
      entity: entity as string,
      action: action as string,
      userId: userId as string,
      startDate: startDate as string,
      endDate: endDate as string,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

export const systemRoutes = router;
