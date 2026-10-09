import { z } from "zod";
import { TicketPriority, TicketStatus } from "@prisma/client";

export const createTicketSchema = z.object({
  contractId: z.string({ required_error: "O contrato é obrigatório." }).min(1),
  title: z.string({ required_error: "Título do chamado é obrigatório." }).min(3).max(200),
  description: z.string({ required_error: "Descrição do chamado é obrigatória." }).min(5).max(5000),
  priority: z.nativeEnum(TicketPriority).default("media"),
  category: z.string().optional(),
  ticketTypeId: z.string().nullish(),
  location: z.string().max(255).optional(),
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
  finalCost: z.number().min(0).max(99_999_999.99).nullish(),
  autoSyncCost: z.boolean().optional(),
});

export const updateTicketSupplierSchema = z.object({
  supplierId: z.string().min(1).nullable(),
  supplierNameSnapshot: z.string().max(200).nullish(),
});

export const attendTicketSchema = z.object({
  flowId: z.string({ required_error: "Fluxo é obrigatório." }).min(1),
  supplierId: z.string().min(1).nullish(),
  supplierNameSnapshot: z.string().max(200).nullish(),
});

export const addTicketStepSchema = z.object({
  title: z.string({ required_error: "O nome da etapa é obrigatório." }).trim().min(1).max(200),
});

// Sem `completed` no corpo, a etapa inverte o estado atual
export const toggleTicketStepSchema = z.object({
  completed: z.boolean().optional(),
});

export const addTicketProductSchema = z.object({
  productId: z.string().min(1).nullish(),
  productNameSnapshot: z.string().max(200).nullish(),
  quantity: z.number().int().min(1).max(1_000_000),
  unitPrice: z.number().min(0).max(99_999_999.99).nullish(),
  notes: z.string().max(2000).nullish(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
export type AddTicketMessageInput = z.infer<typeof addTicketMessageSchema>;
