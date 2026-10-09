import { z } from "zod";

// Campos opcionais aceitam null porque o frontend envia `campo ?? null`.

const orderItemSchema = z.object({
  productId: z.string({ required_error: "O produto é obrigatório em cada item." }).min(1),
  quantity: z.number().int().positive("A quantidade deve ser um número inteiro positivo."),
  unitPrice: z.number().nonnegative().nullish(),
});

export const createMonthlyOrderSchema = z.object({
  contractId: z.string({ required_error: "O contrato é obrigatório." }).min(1),
  mes: z.number().int().min(1).max(12).optional(),
  ano: z.number().int().min(2020).max(2100).optional(),
  notes: z.string().max(1000).nullish(),
  items: z.array(orderItemSchema).min(1, "O pedido deve conter pelo menos 1 item."),
});

export const createExtraOrderSchema = z.object({
  contractId: z.string({ required_error: "O contrato é obrigatório." }).min(1),
  justification: z.string().max(2000).nullish(),
  mes: z.number().int().min(1).max(12).optional(),
  ano: z.number().int().min(2020).max(2100).optional(),
  notes: z.string().max(1000).nullish(),
  items: z.array(orderItemSchema).min(1, "O pedido deve conter pelo menos 1 item."),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pendente", "aprovado", "rejeitado", "entregue", "cancelado"], {
    required_error: "Status é obrigatório.",
  }),
  notes: z.string().max(1000).nullish(),
});

export type CreateMonthlyOrderInput = z.infer<typeof createMonthlyOrderSchema>;
export type CreateExtraOrderInput = z.infer<typeof createExtraOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
