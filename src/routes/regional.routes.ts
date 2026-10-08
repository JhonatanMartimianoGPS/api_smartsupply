import { Router } from "express";
import { regionalController } from "../controllers/regional.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", (req, res, next) => regionalController.list(req, res, next));
router.get("/:id", (req, res, next) => regionalController.getById(req, res, next));
router.post("/", authorize(["super_admin", "admin"]), (req, res, next) =>
  regionalController.create(req, res, next),
);
router.patch("/:id", authorize(["super_admin", "admin"]), (req, res, next) =>
  regionalController.update(req, res, next),
);
router.delete("/:id", authorize(["super_admin"]), (req, res, next) =>
  regionalController.delete(req, res, next),
);

export const regionalRoutes = router;
