import { Router } from "express";
import { contractController } from "../controllers/contract.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);

// Listagem e busca em lote
router.get("/", (req, res, next) => contractController.list(req, res, next));
router.post("/budget-periods/batch", (req, res, next) =>
  contractController.getBudgetPeriodsBatch(req, res, next),
);

// Detalhes, criação, atualização e exclusão
router.get("/:id", (req, res, next) => contractController.getById(req, res, next));
router.post("/", authorize(["super_admin", "admin"]), (req, res, next) =>
  contractController.create(req, res, next),
);
router.patch("/:id", authorize(["super_admin", "admin"]), (req, res, next) =>
  contractController.update(req, res, next),
);
router.delete("/:id", authorize(["super_admin"]), (req, res, next) =>
  contractController.delete(req, res, next),
);

// Períodos e produtos do contrato
router.get("/:id/budget-periods", (req, res, next) =>
  contractController.getBudgetHistory(req, res, next),
);
router.get("/:id/products", (req, res, next) =>
  contractController.getContractProducts(req, res, next),
);
router.get("/:id/last-historical-order", (req, res, next) =>
  contractController.getLastHistoricalOrder(req, res, next),
);

export const contractRoutes = router;
