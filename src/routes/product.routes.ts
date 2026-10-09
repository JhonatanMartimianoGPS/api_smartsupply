import { Router } from "express";
import { productController } from "../controllers/product.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { apiConvention } from "../middlewares/convention.middleware.js";
import { storageService } from "../services/storage.service.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  productImportLookupSchema,
  productImportDuplicateLookupSchema,
  productIdsSchema,
  contractCategoryLinksSchema,
  bulkContractCategoryLinkSchema,
} from "../schemas/product.schema.js";

const router = Router();

router.use(authenticate);
router.use(apiConvention);

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

// Histórico de alterações (caminho fixo: precisa vir antes de /:id)
router.get("/history", (req, res, next) => productController.getHistory(req, res, next));

// Import de planilha
router.post("/import-lookup", validate(productImportLookupSchema), (req, res, next) =>
  productController.importLookup(req, res, next),
);
router.post("/import-duplicate-lookup", validate(productImportDuplicateLookupSchema), (req, res, next) =>
  productController.importDuplicateLookup(req, res, next),
);

// Disponibilidade por categoria de contrato e por contrato
router.post("/category-map", validate(productIdsSchema), (req, res, next) => productController.getCategoryMap(req, res, next));
router.post("/contract-map", validate(productIdsSchema), (req, res, next) => productController.getContractMap(req, res, next));
router.post("/contract-category-links", validate(contractCategoryLinksSchema), (req, res, next) =>
  productController.getContractCategoryLinks(req, res, next),
);
const catalogAdmins = authorize(["super_admin", "admin", "suprimentos"]);
router.post("/bulk-assign-contract-category", catalogAdmins, validate(bulkContractCategoryLinkSchema), (req, res, next) =>
  productController.bulkAssignContractCategory(req, res, next),
);
router.post("/bulk-remove-contract-category", catalogAdmins, validate(bulkContractCategoryLinkSchema), (req, res, next) =>
  productController.bulkRemoveContractCategory(req, res, next),
);
router.get("/:id/categories", (req, res, next) => productController.getProductCategories(req, res, next));

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
