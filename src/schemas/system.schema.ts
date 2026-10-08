import { z } from "zod";
import { AppRole } from "@prisma/client";

// Identificador de categoria: slug curto, como o frontend gera ("suprimentos", "servicos_salas")
const categoryId = z
  .string()
  .regex(/^[a-z0-9_]{1,50}$/, "Use só letras minúsculas, números e _ (até 50 caracteres).");

// Cor é o nome da paleta usada na tela (orange, blue, emerald...)
const color = z.string().regex(/^[a-z]{1,20}$/, "Cor inválida.");

// O frontend envia is_enabled (formato do Supabase); enabled também vale
export const updateSystemModuleSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  category: categoryId.optional(),
  badge: z.string().trim().max(30).nullish(),
  icon: z.string().trim().min(1).max(50).optional(),
  route: z.string().trim().max(100).regex(/^\/[A-Za-z0-9/_-]*$/, "A rota precisa começar com /.").optional(),
  is_enabled: z.boolean().optional(),
  enabled: z.boolean().optional(),
  roles: z.array(z.nativeEnum(AppRole)).max(10).optional(),
});

export const toggleSystemModuleSchema = z.object({
  is_enabled: z.boolean({ required_error: "Informe se o módulo fica ativo." }),
});

export const createSystemModuleCategorySchema = z.object({
  id: categoryId.optional(),
  label: z.string({ required_error: "O nome da categoria é obrigatório." }).trim().min(1).max(60),
  description: z.string().trim().max(300).nullish(),
  color: color.optional(),
  sort_order: z.number().int().min(0).max(1000).optional(),
});

export const updateSystemModuleCategorySchema = createSystemModuleCategorySchema.omit({ id: true }).partial();

export type UpdateSystemModuleInput = z.infer<typeof updateSystemModuleSchema>;
export type CreateSystemModuleCategoryInput = z.infer<typeof createSystemModuleCategorySchema>;
export type UpdateSystemModuleCategoryInput = z.infer<typeof updateSystemModuleCategorySchema>;

// ─── Ações administrativas sobre usuários (/system/admin-actions/*) ──────────
// A tela envia targetUserId e os campos em camelCase (fullName, newPassword...).
const targetUserId = z.string({ required_error: "Usuário é obrigatório." }).min(1);
const fullName = z.string({ required_error: "O nome é obrigatório." }).trim().min(1).max(150);
const email = z.string({ required_error: "O e-mail é obrigatório." }).trim().toLowerCase().email("E-mail inválido.");
const password = z.string().min(6, "A senha precisa ter ao menos 6 caracteres.").max(100);

export const adminCreateUserSchema = z.object({
  email,
  password: password.optional(),
  fullName,
  role: z.nativeEnum(AppRole, { required_error: "O perfil é obrigatório." }),
  regionalIds: z.array(z.string().min(1)).max(50).optional(),
  contractIds: z.array(z.string().min(1)).max(500).optional(),
});
export const adminTargetUserSchema = z.object({ targetUserId });
export const adminResetPasswordSchema = z.object({
  targetUserId,
  newPassword: password.describe("nova senha"),
});
export const adminUpdateProfileSchema = z.object({ targetUserId, fullName });
export const adminUpdateEmailSchema = z.object({ targetUserId, email });
export const adminUpdateRoleSchema = z.object({
  targetUserId,
  role: z.nativeEnum(AppRole, { required_error: "O perfil é obrigatório." }),
});
