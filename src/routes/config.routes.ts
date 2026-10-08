import { Router } from "express";
import { systemController } from "../controllers/system.controller.js";

const router = Router();

// Rota pública para os clientes PWA checarem a versão mínima requerida
router.get("/minimum-client-version", (req, res, next) =>
  systemController.getMinimumClientVersion(req, res, next),
);

export const configRoutes = router;
