import { Router } from "express";
import { stockController } from "../controllers/stock.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { storageService } from "../services/storage.service.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createGrupoSchema,
  createCentroSchema,
  createLocalSchema,
  createProdutoSchema,
  createEntradaSchema,
  createSaidaSchema,
  createSaidaLoteSchema,
  confirmBridgeReceiptSchema,
} from "../schemas/stock.schema.js";

const router = Router();

// Todas as rotas de estoque exigem autenticação ativa
router.use(authenticate);

// ─── CENTROS DE DISTRIBUIÇÃO ──────────────────────────────────────────────────
router.get("/centros-distribuicao", (req, res, next) =>
  stockController.listCentros(req, res, next),
);
router.post(
  "/centros-distribuicao",
  authorize(["super_admin", "admin", "gestor", "suprimentos"]),
  validate(createCentroSchema),
  (req, res, next) => stockController.createCentro(req, res, next),
);
router.get("/centros-distribuicao/:id", (req, res, next) =>
  stockController.getCentroById(req, res, next),
);
router.put(
  "/centros-distribuicao/:id",
  authorize(["super_admin", "admin", "gestor", "suprimentos"]),
  (req, res, next) => stockController.updateCentro(req, res, next),
);
router.delete(
  "/centros-distribuicao/:id",
  authorize(["super_admin", "admin"]),
  (req, res, next) => stockController.deleteCentro(req, res, next),
);

// ─── LOCAIS DE ARMAZENAMENTO ──────────────────────────────────────────────────
router.get("/locais", (req, res, next) =>
  stockController.listLocais(req, res, next),
);
router.post(
  "/locais",
  authorize(["super_admin", "admin", "gestor", "suprimentos"]),
  validate(createLocalSchema),
  (req, res, next) => stockController.createLocal(req, res, next),
);
router.put(
  "/locais/:id",
  authorize(["super_admin", "admin", "gestor", "suprimentos"]),
  (req, res, next) => stockController.updateLocal(req, res, next),
);
router.delete(
  "/locais/:id",
  authorize(["super_admin", "admin"]),
  (req, res, next) => stockController.deleteLocal(req, res, next),
);

// ─── GRUPOS DE ESTOQUE ────────────────────────────────────────────────────────
router.get("/grupos", (req, res, next) =>
  stockController.listGrupos(req, res, next),
);
router.get("/grupos/bridge-regionals", (req, res, next) =>
  stockController.listBridgeRegionals(req, res, next),
);
router.post(
  "/grupos",
  authorize(["super_admin", "admin"]),
  validate(createGrupoSchema),
  (req, res, next) => stockController.createGrupo(req, res, next),
);
router.put(
  "/grupos/:id",
  authorize(["super_admin", "admin"]),
  (req, res, next) => stockController.updateGrupo(req, res, next),
);
router.delete(
  "/grupos/:id",
  authorize(["super_admin", "admin"]),
  (req, res, next) => stockController.deleteGrupo(req, res, next),
);

// ─── PRODUTOS WMS ─────────────────────────────────────────────────────────────
router.get("/produtos", (req, res, next) =>
  stockController.listProdutos(req, res, next),
);
router.post(
  "/produtos/upload-foto",
  storageService.getUploadMiddleware("product-images"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ status_code: 400, message: "Nenhum arquivo enviado.", error: "Bad Request" });
    }
    const info = storageService.formatUploadResult(req.file, "product-images");
    return res.json({ url: info.url });
  },
);
router.get("/produtos/:id", (req, res, next) =>
  stockController.getProdutoById(req, res, next),
);
router.post(
  "/produtos",
  authorize(["super_admin", "admin", "gestor", "suprimentos"]),
  validate(createProdutoSchema),
  (req, res, next) => stockController.createProduto(req, res, next),
);
router.put(
  "/produtos/:id",
  authorize(["super_admin", "admin", "gestor", "suprimentos"]),
  (req, res, next) => stockController.updateProduto(req, res, next),
);
router.delete(
  "/produtos/:id",
  authorize(["super_admin", "admin"]),
  (req, res, next) => stockController.deleteProduto(req, res, next),
);

// ─── FORNECEDORES WMS ─────────────────────────────────────────────────────────
router.get("/fornecedores", (req, res, next) =>
  stockController.listFornecedores(req, res, next),
);
router.post(
  "/fornecedores",
  authorize(["super_admin", "admin", "gestor", "suprimentos"]),
  (req, res, next) => stockController.createFornecedor(req, res, next),
);
router.put(
  "/fornecedores/:id",
  authorize(["super_admin", "admin", "gestor", "suprimentos"]),
  (req, res, next) => stockController.updateFornecedor(req, res, next),
);
router.delete(
  "/fornecedores/:id",
  authorize(["super_admin", "admin"]),
  (req, res, next) => stockController.deleteFornecedor(req, res, next),
);

// ─── PROFISSIONAIS WMS ────────────────────────────────────────────────────────
router.get("/profissionais", (req, res, next) =>
  stockController.listProfissionais(req, res, next),
);
router.get("/profissionais/by-user/:userId", (req, res, next) =>
  stockController.getProfissionalByUserId(req, res, next),
);
router.get("/profissionais/lookup", (req, res, next) =>
  stockController.lookupProfissional(req, res, next),
);
router.post(
  "/profissionais",
  authorize(["super_admin", "admin", "gestor", "suprimentos"]),
  (req, res, next) => stockController.createProfissional(req, res, next),
);
router.put(
  "/profissionais/:id",
  authorize(["super_admin", "admin", "gestor", "suprimentos"]),
  (req, res, next) => stockController.updateProfissional(req, res, next),
);
router.delete(
  "/profissionais/:id",
  authorize(["super_admin", "admin"]),
  (req, res, next) => stockController.deleteProfissional(req, res, next),
);

// ─── INVENTÁRIO CONSOLIDADO ───────────────────────────────────────────────────
router.get("/inventario", (req, res, next) =>
  stockController.getInventario(req, res, next),
);
router.get("/inventario/:produtoId/detalhes", (req, res, next) =>
  stockController.getInventarioDetalhes(req, res, next),
);

// ─── MOVIMENTAÇÕES DE ESTOQUE ─────────────────────────────────────────────────
router.get("/movimentacoes/entradas", (req, res, next) =>
  stockController.listEntradas(req, res, next),
);
router.get("/movimentacoes/saidas", (req, res, next) =>
  stockController.listSaidas(req, res, next),
);
router.post("/movimentacoes/entradas", validate(createEntradaSchema), (req, res, next) =>
  stockController.createEntrada(req, res, next),
);
router.post("/movimentacoes/saidas", validate(createSaidaSchema), (req, res, next) =>
  stockController.createSaida(req, res, next),
);
router.post("/movimentacoes/saidas/lote", validate(createSaidaLoteSchema), (req, res, next) =>
  stockController.createSaidaLote(req, res, next),
);

// ─── PATRIMÔNIO & FLUXOS DE ATIVOS ───────────────────────────────────────────
router.get("/patrimonio/itens", (req, res, next) =>
  stockController.listPatrimonioItens(req, res, next),
);
router.post("/patrimonio/itens", (req, res, next) =>
  stockController.createPatrimonioItem(req, res, next),
);
router.post(
  "/patrimonio/upload-foto",
  storageService.getUploadMiddleware("product-images"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ status_code: 400, message: "Nenhum arquivo enviado.", error: "Bad Request" });
    }
    const info = storageService.formatUploadResult(req.file, "product-images");
    return res.json({ url: info.url });
  },
);
router.put("/patrimonio/itens/:id", (req, res, next) =>
  stockController.updatePatrimonioItem(req, res, next),
);
router.delete(
  "/patrimonio/itens/:id",
  authorize(["super_admin", "admin"]),
  (req, res, next) => stockController.deletePatrimonioItem(req, res, next),
);
router.get("/patrimonio/fluxos", (req, res, next) =>
  stockController.listPatrimonioFluxos(req, res, next),
);
router.post("/patrimonio/fluxos", (req, res, next) =>
  stockController.createPatrimonioFluxo(req, res, next),
);
router.post("/patrimonio/fluxos/:id/eventos", (req, res, next) =>
  stockController.addPatrimonioFluxoEvento(req, res, next),
);
router.post("/patrimonio/fluxos/:id/encerrar", (req, res, next) =>
  stockController.encerrarPatrimonioFluxo(req, res, next),
);

// ─── DASHBOARD & STATS ────────────────────────────────────────────────────────
router.get("/dashboard", (req, res, next) =>
  stockController.getDashboardStats(req, res, next),
);
router.get("/dashboard/stats", (req, res, next) =>
  stockController.getDashboardStats(req, res, next),
);

// ─── USUÁRIOS, PERFIS & RBAC UNIFICADOS ───────────────────────────────────────
router.get("/users/:userId/roles", (req, res, next) =>
  stockController.getUserRoles(req, res, next),
);
router.get("/users/:userId/group-views", (req, res, next) =>
  stockController.getUserGroupViews(req, res, next),
);
router.get("/admin/users", authorize(["super_admin", "admin"]), (req, res, next) =>
  stockController.listAdminUsers(req, res, next),
);
router.post("/admin/users", authorize(["super_admin", "admin"]), (req, res, next) =>
  stockController.createAdminUser(req, res, next),
);
router.put("/admin/users/:userId/profile", authorize(["super_admin", "admin"]), (req, res, next) =>
  stockController.updateAdminUserProfile(req, res, next),
);
router.post("/admin/users/:userId/password", authorize(["super_admin", "admin"]), (req, res, next) =>
  stockController.setAdminUserPassword(req, res, next),
);
router.delete("/admin/users/:userId", authorize(["super_admin", "admin"]), (req, res, next) =>
  stockController.deleteAdminUser(req, res, next),
);
router.post("/admin/users/:userId/roles", authorize(["super_admin", "admin"]), (req, res, next) =>
  stockController.addUserRole(req, res, next),
);
router.delete("/admin/users/:userId/roles/:role", authorize(["super_admin", "admin"]), (req, res, next) =>
  stockController.removeUserRole(req, res, next),
);
router.post("/admin/users/:userId/grupos", authorize(["super_admin", "admin"]), (req, res, next) =>
  stockController.addUserGrupo(req, res, next),
);
router.delete("/admin/users/:userId/grupos/:grupoId", authorize(["super_admin", "admin"]), (req, res, next) =>
  stockController.removeUserGrupo(req, res, next),
);
router.get("/profiles/:userId", (req, res, next) =>
  stockController.getProfile(req, res, next),
);
router.put("/profiles/:userId", (req, res, next) =>
  stockController.updateProfile(req, res, next),
);

// ─── INTEGRAÇÃO BRIDGE - STOCK ───────────────────────────────────────────────
router.get("/integracao/pedidos-pendentes", (req, res, next) =>
  stockController.getPendingBridgeOrders(req, res, next),
);
router.get("/integracao/pedidos-pendentes/:orderId", (req, res, next) =>
  stockController.getPendingBridgeOrderDetails(req, res, next),
);
router.post(
  "/integracao/pedidos-pendentes/:orderId/confirmar",
  validate(confirmBridgeReceiptSchema),
  (req, res, next) => stockController.confirmBridgeOrderReceipt(req, res, next),
);
router.get("/integracao/auditoria", (req, res, next) =>
  stockController.getBridgeStockIntegrationAudit(req, res, next),
);

export const stockRoutes = router;
