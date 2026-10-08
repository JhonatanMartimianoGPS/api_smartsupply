-- Prioridade "critica" passa a se chamar "urgente", como no Supabase e no frontend.
-- RENAME VALUE preserva os chamados já gravados (o Prisma geraria um tipo novo e descartaria o valor antigo).
ALTER TYPE "TicketPriority" RENAME VALUE 'critica' TO 'urgente';

-- Chamado novo nasce com o custo sincronizado aos produtos (padrão do Supabase).
ALTER TABLE "service_tickets" ALTER COLUMN "auto_sync_cost" SET DEFAULT true;

-- CreateIndex
CREATE INDEX "service_tickets_contract_id_created_at_idx" ON "service_tickets"("contract_id", "created_at");

-- CreateIndex
CREATE INDEX "ticket_attachments_ticket_id_idx" ON "ticket_attachments"("ticket_id");

-- CreateIndex
CREATE INDEX "ticket_messages_ticket_id_created_at_idx" ON "ticket_messages"("ticket_id", "created_at");

-- CreateIndex
CREATE INDEX "ticket_products_ticket_id_idx" ON "ticket_products"("ticket_id");

-- CreateIndex
CREATE INDEX "ticket_steps_ticket_id_idx" ON "ticket_steps"("ticket_id");
