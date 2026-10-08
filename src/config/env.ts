import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  JWT_SECRET: z.string().min(8, "JWT_SECRET deve ter no mínimo 8 caracteres"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  JWT_REFRESH_SECRET: z.string().min(8, "JWT_REFRESH_SECRET deve ter no mínimo 8 caracteres"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  CORS_ORIGIN: z.string().default("*"),
  STORAGE_DRIVER: z.enum(["local", "azure"]).default("local"),
  STORAGE_BASE_URL: z.string().default("http://localhost:3000"),
  AZURE_STORAGE_CONNECTION_STRING: z.string().optional(),
});

export const env = envSchema.parse(process.env);
