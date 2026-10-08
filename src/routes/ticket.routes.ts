import { Router } from "express";
import { ticketController } from "../controllers/ticket.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { storageService } from "../services/storage.service.js";
import {
  createTicketSchema,
  updateTicketStatusSchema,
  addTicketMessageSchema,
} from "../schemas/ticket.schema.js";

const router = Router();

router.use(authenticate);

// Catálogo de tipos e fluxos
router.get("/types", (req, res, next) => ticketController.listTypes(req, res, next));
router.get("/flows", (req, res, next) => ticketController.listFlows(req, res, next));

// Listagem geral e criação
router.get("/", (req, res, next) => ticketController.list(req, res, next));
router.post("/", validate(createTicketSchema), (req, res, next) =>
  ticketController.create(req, res, next),
);

// Detalhes e exclusão
router.get("/:id", (req, res, next) => ticketController.getById(req, res, next));
router.delete("/:id", (req, res, next) => ticketController.delete(req, res, next));

// Transições de status e fluxos
router.patch(
  "/:id/status",
  validate(updateTicketStatusSchema),
  (req, res, next) => ticketController.updateStatus(req, res, next),
);
router.patch("/:id/priority", (req, res, next) => ticketController.updatePriority(req, res, next));
router.patch("/:id/cost", (req, res, next) => ticketController.updateCost(req, res, next));
router.patch("/:id/supplier", (req, res, next) => ticketController.updateSupplier(req, res, next));
router.post("/:id/attend", (req, res, next) => ticketController.attend(req, res, next));
router.post("/:id/start-attention", (req, res, next) => ticketController.startAttention(req, res, next));

// Etapas do checklist
router.post("/:id/steps", (req, res, next) => ticketController.addStep(req, res, next));
router.patch("/steps/:stepId/toggle", (req, res, next) => ticketController.toggleStep(req, res, next));
router.delete("/steps/:stepId", (req, res, next) => ticketController.deleteStep(req, res, next));

// Chat / Mensagens
router.get("/:id/messages", (req, res, next) => ticketController.getMessages(req, res, next));
router.post(
  "/:id/messages",
  validate(addTicketMessageSchema),
  (req, res, next) => ticketController.addMessage(req, res, next),
);
router.delete("/messages/:messageId", (req, res, next) => ticketController.deleteMessage(req, res, next));

// Anexos
router.get("/:id/attachments", (req, res, next) => ticketController.getAttachments(req, res, next));
router.post(
  "/:id/attachments",
  storageService.getUploadMiddleware("ticket-attachments"),
  (req, res, next) => ticketController.addAttachment(req, res, next),
);
router.delete("/attachments/:attachmentId", (req, res, next) => ticketController.deleteAttachment(req, res, next));

// Produtos / Custos
router.get("/:id/products", (req, res, next) => ticketController.getProducts(req, res, next));
router.post("/:id/products", (req, res, next) => ticketController.addProduct(req, res, next));
router.delete("/products/:productId", (req, res, next) => ticketController.deleteProduct(req, res, next));

export const ticketRoutes = router;
