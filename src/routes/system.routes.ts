import { Router } from "express";
import { systemController } from "../controllers/system.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { storageService } from "../services/storage.service.js";
import { auditService } from "../services/audit.service.js";

const router = Router();

// Telemetria pública ou autenticada
router.get("/health", (req, res, next) => systemController.getHealth(req, res, next));
router.get("/health/ping", (req, res, next) => systemController.ping(req, res, next));

// Rotas autenticadas
router.use(authenticate);

// Upload de avatar de membros da equipe
router.post(
  "/team-members/avatar",
  authorize(["super_admin", "admin"]),
  storageService.getUploadMiddleware("avatars"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ statusCode: 400, message: "Nenhum arquivo enviado.", error: "Bad Request" });
    }
    const info = storageService.formatUploadResult(req.file, "avatars");
    return res.json({ url: info.url, fileName: info.fileName, size: info.size });
  },
);

// Módulos do Sistema
router.get("/modules", (req, res, next) => systemController.listModules(req, res, next));
router.patch("/modules/:id", authorize(["super_admin"]), (req, res, next) =>
  systemController.updateModule(req, res, next),
);
router.patch("/modules/:id/toggle", authorize(["super_admin"]), (req, res, next) =>
  systemController.toggleModule(req, res, next),
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
