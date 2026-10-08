-- Unificação de Fornecedores: Apontar stock_entradas diretamente para registered_suppliers e remover tabela redundante stock_fornecedores
ALTER TABLE "stock_entradas" DROP CONSTRAINT IF EXISTS "stock_entradas_fornecedor_id_fkey";

ALTER TABLE "stock_entradas" ADD CONSTRAINT "stock_entradas_fornecedor_id_fkey"
FOREIGN KEY ("fornecedor_id") REFERENCES "registered_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP TABLE IF EXISTS "stock_fornecedores" CASCADE;
