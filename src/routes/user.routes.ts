import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

// Todas as rotas de usuários requerem autenticação
router.use(authenticate);

// Listagem de usuários mentionable (@user) disponível para todos os autenticados
router.get("/mentionable", (req, res, next) => userController.listMentionable(req, res, next));

// Listagem geral de usuários (gestores e admins)
router.get("/", authorize(["super_admin", "admin", "gestor", "suprimentos"]), (req, res, next) =>
  userController.list(req, res, next),
);

// Obter detalhes de usuário
router.get("/:id", authorize(["super_admin", "admin", "gestor"]), (req, res, next) =>
  userController.getById(req, res, next),
);

// Criar usuário (super_admin e admin)
router.post("/", authorize(["super_admin", "admin"]), (req, res, next) =>
  userController.create(req, res, next),
);

// Atualizar usuário
router.patch("/:id", authorize(["super_admin", "admin"]), (req, res, next) =>
  userController.update(req, res, next),
);

// Bloquear / Desbloquear usuário
router.patch("/:id/block", authorize(["super_admin", "admin"]), (req, res, next) =>
  userController.toggleBlock(req, res, next),
);

// Atribuir regionais ao usuário
router.post("/:id/regionals", authorize(["super_admin", "admin"]), (req, res, next) =>
  userController.assignRegionals(req, res, next),
);

// Atribuir contratos ao usuário
router.post("/:id/contracts", authorize(["super_admin", "admin"]), (req, res, next) =>
  userController.assignContracts(req, res, next),
);

// Excluir usuário
router.delete("/:id", authorize(["super_admin"]), (req, res, next) =>
  userController.delete(req, res, next),
);

export const userRoutes = router;
