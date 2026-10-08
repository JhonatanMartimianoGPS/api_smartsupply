import { Router } from "express";
import { productController } from "../controllers/product.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { storageService } from "../services/storage.service.js";

const router = Router();

router.use(authenticate);

// Upload de imagem do produto
router.post(
  "/image",
  authorize(["super_admin", "admin", "suprimentos"]),
  storageService.getUploadMiddleware("product-images"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ statusCode: 400, message: "Nenhum arquivo enviado.", error: "Bad Request" });
    }
    const info = storageService.formatUploadResult(req.file, "product-images");
    return res.json({ url: info.url, fileName: info.fileName, size: info.size });
  },
);

// Listagem e filtros especiais
router.get("/paginated", (req, res, next) => productController.listPaginated(req, res, next));
router.get("/filter-options", (req, res, next) => productController.getFilterOptions(req, res, next));
router.get("/duplicate-index", (req, res, next) => productController.getDuplicateIndex(req, res, next));
router.get("/", (req, res, next) => productController.list(req, res, next));
// Validação do rascunho de pedido: quais produtos podem entrar no contrato
router.post("/validate-contract-draft-items", (req, res, next) =>
  productController.validateContractDraftItems(req, res, next),
);

// Detalhes, criação, edição e exclusão
router.get("/:id", (req, res, next) => productController.getById(req, res, next));
router.post("/", authorize(["super_admin", "admin", "suprimentos"]), (req, res, next) =>
  productController.create(req, res, next),
);
router.patch("/:id", authorize(["super_admin", "admin", "suprimentos"]), (req, res, next) =>
  productController.update(req, res, next),
);
router.delete("/:id", authorize(["super_admin", "admin"]), (req, res, next) =>
  productController.delete(req, res, next),
);

export const productRoutes = router;
