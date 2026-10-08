import { Router } from "express";
import { orderController } from "../controllers/order.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createMonthlyOrderSchema,
  createExtraOrderSchema,
  updateOrderStatusSchema,
} from "../schemas/order.schema.js";

const router = Router();

router.use(authenticate);

// Listagens específicas
router.get("/me", (req, res, next) => orderController.getMyOrders(req, res, next));
router.get("/active-month", (req, res, next) => orderController.getActiveMonthOrders(req, res, next));
router.get("/current-month", (req, res, next) => orderController.getCurrentMonthOrder(req, res, next));
router.post("/items/query", (req, res, next) => orderController.queryItems(req, res, next));

// Divergências de entrega
router.get("/delivery-divergences", (req, res, next) => orderController.listDivergences(req, res, next));
router.post("/delivery-divergences", (req, res, next) => orderController.createDivergence(req, res, next));
router.patch("/delivery-divergences/:id/resolve", authorize(["super_admin", "admin", "suprimentos"]), (req, res, next) =>
  orderController.resolveDivergence(req, res, next),
);

// Relatos de problemas
router.get("/issue-reports", (req, res, next) => orderController.listIssueReports(req, res, next));
router.post("/issue-reports", (req, res, next) => orderController.createIssueReport(req, res, next));
router.patch("/issue-reports/:id/status", authorize(["super_admin", "admin", "suprimentos"]), (req, res, next) =>
  orderController.updateIssueReportStatus(req, res, next),
);

// Listagem geral de pedidos
router.get("/", (req, res, next) => orderController.list(req, res, next));

// Criação de pedidos com validação Zod
router.post("/", validate(createMonthlyOrderSchema), (req, res, next) =>
  orderController.createMonthly(req, res, next),
);
router.post("/extra", validate(createExtraOrderSchema), (req, res, next) =>
  orderController.createExtra(req, res, next),
);

// Operações por ID
router.get("/:id", (req, res, next) => orderController.getById(req, res, next));
router.put("/:id/items", authorize(["super_admin", "admin", "suprimentos"]), (req, res, next) =>
  orderController.updateItems(req, res, next),
);
router.patch(
  "/:id/status",
  authorize(["super_admin", "admin", "gestor", "suprimentos"]),
  validate(updateOrderStatusSchema),
  (req, res, next) => orderController.updateStatus(req, res, next),
);
router.get("/:id/history", (req, res, next) => orderController.getHistory(req, res, next));
router.post("/:id/history", (req, res, next) => orderController.addHistory(req, res, next));
router.delete("/:id", (req, res, next) => orderController.delete(req, res, next));

export const orderRoutes = router;
