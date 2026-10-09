import { Router } from "express";
import { notificationController } from "../controllers/notification.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { apiConvention } from "../middlewares/convention.middleware.js";

const router = Router();

router.use(authenticate);
router.use(apiConvention);

router.get("/", (req, res, next) => notificationController.list(req, res, next));
router.post("/read-all", (req, res, next) => notificationController.markAllAsRead(req, res, next));
router.delete("/all", (req, res, next) => notificationController.deleteAll(req, res, next));

router.patch("/:id/read", (req, res, next) => notificationController.markAsRead(req, res, next));
router.delete("/:id", (req, res, next) => notificationController.delete(req, res, next));
router.patch("/ticket/:ticketId/read", (req, res, next) =>
  notificationController.markTicketNotificationsAsRead(req, res, next),
);

export const notificationRoutes = router;
