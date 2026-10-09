import { Router } from "express";
import { feedController } from "../controllers/feed.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { apiConvention } from "../middlewares/convention.middleware.js";
import { storageService } from "../services/storage.service.js";

const router = Router();

router.use(authenticate);
router.use(apiConvention);

// Upload de anexos para o feed
router.post(
  "/attachments",
  storageService.getUploadMiddleware("feed-attachments"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ status_code: 400, message: "Nenhum arquivo enviado.", error: "Bad Request" });
    }
    const info = storageService.formatUploadResult(req.file, "feed-attachments");
    return res.json({ url: info.url, fileName: info.fileName, size: info.size });
  },
);

// Listagem e criação de posts
router.get("/posts", (req, res, next) => feedController.listPosts(req, res, next));
router.post("/posts", (req, res, next) => feedController.createPost(req, res, next));

// Operações por post
router.patch("/posts/:id", (req, res, next) => feedController.updatePost(req, res, next));
router.delete("/posts/:id", (req, res, next) => feedController.deletePost(req, res, next));
router.patch("/posts/:id/pin", authorize(["super_admin", "admin"]), (req, res, next) =>
  feedController.togglePin(req, res, next),
);

// Likes de post
router.post("/posts/:id/like", (req, res, next) => feedController.likePost(req, res, next));
router.delete("/posts/:id/like", (req, res, next) => feedController.unlikePost(req, res, next));

// Comentários
router.get("/posts/:id/comments", (req, res, next) => feedController.listComments(req, res, next));
router.post("/posts/:id/comments", (req, res, next) => feedController.addComment(req, res, next));
router.delete("/comments/:id", (req, res, next) => feedController.deleteComment(req, res, next));

export const feedRoutes = router;
