-- Unificação de Profissionais: Apontar retiradas de estoque e patrimônio diretamente para users e remover stock_profissionais
ALTER TABLE "stock_saidas" DROP CONSTRAINT IF EXISTS "stock_saidas_retirado_por_id_fkey";

ALTER TABLE "stock_saidas" ADD CONSTRAINT "stock_saidas_retirado_por_id_fkey" 
FOREIGN KEY ("retirado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_patrimonio_itens" DROP CONSTRAINT IF EXISTS "stock_patrimonio_itens_profissional_id_fkey";
ALTER TABLE "stock_patrimonio_itens" DROP COLUMN IF EXISTS "profissional_id";

DROP TABLE IF EXISTS "stock_profissionais" CASCADE;
