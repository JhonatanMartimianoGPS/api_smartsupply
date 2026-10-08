import { z } from "zod";

const orderItemSchema = z.object({
  productId: z.string().optional(),
  product_id: z.string().optional(),
  quantity: z.number().int().positive("A quantidade deve ser um número inteiro positivo."),
  unitPrice: z.number().nonnegative().optional(),
  unit_price: z.number().nonnegative().optional(),
}).refine((data) => data.productId || data.product_id, {
  message: "O ID do produto (productId ou product_id) é obrigatório para cada item.",
});

export const createMonthlyOrderSchema = z.object({
  contractId: z.string().optional(),
  contract_id: z.string().optional(),
  mes: z.number().int().min(1).max(12).optional(),
  ano: z.number().int().min(2020).max(2100).optional(),
  notes: z.string().max(1000).optional(),
  items: z.array(orderItemSchema).min(1, "O pedido deve conter pelo menos 1 item."),
}).refine((data) => data.contractId || data.contract_id, {
  message: "O ID do contrato (contractId ou contract_id) é obrigatório.",
});

export const createExtraOrderSchema = z.object({
  contractId: z.string().optional(),
  contract_id: z.string().optional(),
  justification: z.string().min(5, "A justificativa deve conter no mínimo 5 caracteres.").max(2000),
  mes: z.number().int().min(1).max(12).optional(),
  ano: z.number().int().min(2020).max(2100).optional(),
  notes: z.string().max(1000).optional(),
  items: z.array(orderItemSchema).min(1, "O pedido deve conter pelo menos 1 item."),
}).refine((data) => data.contractId || data.contract_id, {
  message: "O ID do contrato (contractId ou contract_id) é obrigatório.",
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pendente", "aprovado", "rejeitado", "entregue", "cancelado"], {
    required_error: "Status é obrigatório.",
  }),
  notes: z.string().max(1000).optional(),
});

export type CreateMonthlyOrderInput = z.infer<typeof createMonthlyOrderSchema>;
export type CreateExtraOrderInput = z.infer<typeof createExtraOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
