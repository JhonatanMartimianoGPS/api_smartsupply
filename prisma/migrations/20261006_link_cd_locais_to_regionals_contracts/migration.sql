-- Ligação direta de Centros de Distribuição e Locais a Regional e Contrato
ALTER TABLE "stock_centros_distribuicao" ALTER COLUMN "regional_id" SET NOT NULL;
ALTER TABLE "stock_centros_distribuicao" ALTER COLUMN "grupo_id" DROP NOT NULL;

ALTER TABLE "stock_locais_armazenamento" ALTER COLUMN "centro_distribuicao_id" SET NOT NULL;
ALTER TABLE "stock_locais_armazenamento" ALTER COLUMN "grupo_id" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_stock_cd_regional_contract" ON "stock_centros_distribuicao" ("regional_id", "contract_id");
CREATE INDEX IF NOT EXISTS "idx_stock_locais_cd" ON "stock_locais_armazenamento" ("centro_distribuicao_id");
