import { Router } from "express";
import { dashboardController } from "../controllers/dashboard.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { apiConvention } from "../middlewares/convention.middleware.js";

const router = Router();

router.use(authenticate);
router.use(apiConvention);

router.get("/order-stats", (req, res, next) => dashboardController.getOrderStats(req, res, next));
router.get("/contract-spending", (req, res, next) => dashboardController.getContractSpending(req, res, next));
router.get("/monthly-spending", (req, res, next) => dashboardController.getMonthlySpending(req, res, next));
router.get("/category-spending", (req, res, next) => dashboardController.getCategorySpending(req, res, next));
router.get("/product-supplier-spending", (req, res, next) =>
  dashboardController.getProductAndSupplierSpending(req, res, next),
);
router.get("/approval-history", (req, res, next) => dashboardController.getApprovalHistory(req, res, next));

export const dashboardRoutes = router;
