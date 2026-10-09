import { Router } from "express";
import { categoryController } from "../controllers/category.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { syncProductsForCategorySchema } from "../schemas/product.schema.js";

const router = Router();

router.use(authenticate);

// ─── Categorias de Produto (/categories/products) ──────────────────────────
router.get("/products", (req, res, next) =>
  categoryController.listProductCategories(req, res, next),
);
router.post("/products", authorize(["super_admin", "admin", "suprimentos"]), (req, res, next) =>
  categoryController.createProductCategory(req, res, next),
);
router.patch("/products/:id", authorize(["super_admin", "admin", "suprimentos"]), (req, res, next) =>
  categoryController.updateProductCategory(req, res, next),
);
router.delete("/products/:id", authorize(["super_admin", "admin"]), (req, res, next) =>
  categoryController.deleteProductCategory(req, res, next),
);

// ─── Categorias de Contrato (/categories/contracts) ────────────────────────
router.get("/contracts", (req, res, next) =>
  categoryController.listContractCategories(req, res, next),
);
router.post("/contracts", authorize(["super_admin", "admin"]), (req, res, next) =>
  categoryController.createContractCategory(req, res, next),
);
router.patch("/contracts/:id", authorize(["super_admin", "admin"]), (req, res, next) =>
  categoryController.updateContractCategory(req, res, next),
);
router.delete("/contracts/:id", authorize(["super_admin"]), (req, res, next) =>
  categoryController.deleteContractCategory(req, res, next),
);
router.post("/contracts/:id/sync-contracts", authorize(["super_admin", "admin"]), (req, res, next) =>
  categoryController.syncContracts(req, res, next),
);
router.post(
  "/products/:id/sync-products",
  authorize(["super_admin", "admin", "suprimentos"]),
  validate(syncProductsForCategorySchema),
  (req, res, next) => categoryController.syncProducts(req, res, next),
);

export const categoryRoutes = router;
