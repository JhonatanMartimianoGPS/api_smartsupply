import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string({ required_error: "E-mail é obrigatório." })
    .email("Formato de e-mail inválido.")
    .transform((val) => val.trim().toLowerCase()),
  password: z
    .string({ required_error: "Senha é obrigatória." })
    .min(6, "A senha deve ter no mínimo 6 caracteres."),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string({ required_error: "Refresh token é obrigatório." }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
