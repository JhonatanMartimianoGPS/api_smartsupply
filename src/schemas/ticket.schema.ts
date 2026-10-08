import { z } from "zod";
import { TicketPriority, TicketStatus } from "@prisma/client";

export const createTicketSchema = z.object({
  contractId: z.string().optional(),
  contract_id: z.string().optional(),
  title: z.string({ required_error: "Título do chamado é obrigatório." }).min(3).max(200),
  description: z.string({ required_error: "Descrição do chamado é obrigatória." }).min(5).max(5000),
  priority: z.nativeEnum(TicketPriority).default("media"),
  category: z.string().optional(),
  ticketTypeId: z.string().nullish(),
  ticket_type_id: z.string().nullish(),
  serviceTypeId: z.string().optional(),
  service_type_id: z.string().optional(),
  location: z.string().max(255).optional(),
}).refine((data) => data.contractId || data.contract_id, {
  message: "O ID do contrato (contractId ou contract_id) é obrigatório.",
});

export const updateTicketStatusSchema = z.object({
  status: z.nativeEnum(TicketStatus, { required_error: "Status é obrigatório." }),
  notes: z.string().max(1000).optional(),
});

export const addTicketMessageSchema = z.object({
  message: z.string({ required_error: "Mensagem é obrigatória." }).min(1).max(3000),
  isInternal: z.boolean().optional(),
});

export const updateTicketPrioritySchema = z.object({
  priority: z.nativeEnum(TicketPriority, { required_error: "Prioridade é obrigatória." }),
});

export const updateTicketCostSchema = z.object({
  final_cost: z.number().min(0).max(99_999_999.99).nullish(),
  auto_sync_cost: z.boolean().optional(),
});

export const updateTicketSupplierSchema = z.object({
  supplier_id: z.string().min(1).nullable(),
  supplier_name_snapshot: z.string().max(200).nullish(),
});

// O front envia flow_id/supplier_id (formato do Supabase); flowId/supplierId também valem
export const attendTicketSchema = z
  .object({
    flowId: z.string().min(1).optional(),
    flow_id: z.string().min(1).optional(),
    supplierId: z.string().min(1).nullish(),
    supplier_id: z.string().min(1).nullish(),
    supplier_name_snapshot: z.string().max(200).nullish(),
  })
  .refine((data) => data.flowId || data.flow_id, { message: "Fluxo é obrigatório." });

// O front envia { name }; title é o nome do campo no banco
export const addTicketStepSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    title: z.string().trim().min(1).max(200).optional(),
  })
  .refine((data) => data.name || data.title, { message: "O nome da etapa é obrigatório." });

export const toggleTicketStepSchema = z.object({
  is_completed: z.boolean().optional(),
});

export const addTicketProductSchema = z.object({
  productId: z.string().min(1).nullish(),
  product_id: z.string().min(1).nullish(),
  product_name_snapshot: z.string().max(200).nullish(),
  quantity: z.number().int().min(1).max(1_000_000),
  unitPrice: z.number().min(0).max(99_999_999.99).nullish(),
  unit_price: z.number().min(0).max(99_999_999.99).nullish(),
  notes: z.string().max(2000).nullish(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
export type AddTicketMessageInput = z.infer<typeof addTicketMessageSchema>;
