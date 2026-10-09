import { Router } from "express";
import { supplierController } from "../controllers/supplier.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { apiConvention } from "../middlewares/convention.middleware.js";

const router = Router();

router.use(authenticate);
router.use(apiConvention);

// Listagem e utilitários de consolidação
router.get("/", (req, res, next) => supplierController.list(req, res, next));
router.post("/merge", authorize(["super_admin", "admin"]), (req, res, next) =>
  supplierController.merge(req, res, next),
);
router.post("/consolidated-orders", (req, res, next) =>
  supplierController.getConsolidatedOrders(req, res, next),
);

// Detalhes, criação, edição e exclusão
router.get("/:id", (req, res, next) => supplierController.getById(req, res, next));
router.post("/", authorize(["super_admin", "admin", "suprimentos"]), (req, res, next) =>
  supplierController.create(req, res, next),
);
router.patch("/:id", authorize(["super_admin", "admin", "suprimentos"]), (req, res, next) =>
  supplierController.update(req, res, next),
);
router.delete("/:id", authorize(["super_admin", "admin"]), (req, res, next) =>
  supplierController.delete(req, res, next),
);

export const supplierRoutes = router;
