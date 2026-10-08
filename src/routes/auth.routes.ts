import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { z } from "zod";

const router = Router();

const loginSchema = z.object({
  email: z.string().email("E-mail com formato inválido"),
  password: z.string().min(1, "A senha é obrigatória"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token é obrigatório"),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "A senha atual é obrigatória"),
  newPassword: z.string().min(6, "A nova senha deve ter no mínimo 6 caracteres"),
});

router.post("/login", validate(loginSchema), AuthController.login);
router.post("/refresh", validate(refreshSchema), AuthController.refreshToken);
router.post("/logout", AuthController.logout);

// Rotas autenticadas
router.get("/me", authenticate, AuthController.getMe);
router.post("/change-password", authenticate, validate(changePasswordSchema), AuthController.changePassword);

export const authRoutes = router;
