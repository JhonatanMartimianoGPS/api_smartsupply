import { z } from "zod";

export const createTicketSchema = z.object({
  contractId: z.string().optional(),
  contract_id: z.string().optional(),
  title: z.string({ required_error: "Título do chamado é obrigatório." }).min(3).max(200),
  description: z.string({ required_error: "Descrição do chamado é obrigatória." }).min(5).max(5000),
  priority: z.enum(["baixa", "media", "alta", "urgente"]).default("media"),
  category: z.string().optional(),
  serviceTypeId: z.string().optional(),
  service_type_id: z.string().optional(),
  location: z.string().max(255).optional(),
}).refine((data) => data.contractId || data.contract_id, {
  message: "O ID do contrato (contractId ou contract_id) é obrigatório.",
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(["aberto", "em_andamento", "aguardando_aprovacao", "concluido", "cancelado"], {
    required_error: "Status é obrigatório.",
  }),
  notes: z.string().max(1000).optional(),
});

export const addTicketMessageSchema = z.object({
  message: z.string({ required_error: "Mensagem é obrigatória." }).min(1).max(3000),
  isInternal: z.boolean().optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
export type AddTicketMessageInput = z.infer<typeof addTicketMessageSchema>;
