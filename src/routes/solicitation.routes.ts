import { Router } from "express";
import { solicitationController } from "../controllers/solicitation.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { apiConvention } from "../middlewares/convention.middleware.js";

const router = Router();

router.use(authenticate);
router.use(apiConvention);

router.get("/", (req, res, next) => solicitationController.list(req, res, next));
router.post("/", (req, res, next) => solicitationController.create(req, res, next));

router.get("/:id", (req, res, next) => solicitationController.getById(req, res, next));
router.put("/:id/items", authorize(["super_admin", "admin", "suprimentos", "gestor"]), (req, res, next) => solicitationController.updateItems(req, res, next));
router.patch("/:id/step", authorize(["super_admin", "admin", "suprimentos", "gestor"]), (req, res, next) => solicitationController.updateStep(req, res, next));
router.post("/:id/revert", authorize(["super_admin", "admin", "suprimentos", "gestor"]), (req, res, next) => solicitationController.revertStep(req, res, next));
router.delete("/:id", authorize(["super_admin", "admin"]), (req, res, next) =>
  solicitationController.delete(req, res, next),
);

router.get("/:id/history", (req, res, next) => solicitationController.getHistory(req, res, next));
router.post("/:id/history", (req, res, next) => solicitationController.addHistory(req, res, next));

export const solicitationRoutes = router;
