-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "product_category_id_snapshot" TEXT;

-- CreateIndex
CREATE INDEX "contracts_regional_id_idx" ON "contracts"("regional_id");

-- CreateIndex
CREATE INDEX "order_delivery_divergences_order_id_idx" ON "order_delivery_divergences"("order_id");

-- CreateIndex
CREATE INDEX "order_history_order_id_created_at_idx" ON "order_history"("order_id", "created_at");

-- CreateIndex
CREATE INDEX "order_issue_reports_order_id_idx" ON "order_issue_reports"("order_id");

-- CreateIndex
CREATE INDEX "orders_contract_id_ano_mes_status_idx" ON "orders"("contract_id", "ano", "mes", "status");

-- CreateIndex
CREATE INDEX "products_supplier_id_idx" ON "products"("supplier_id");


-- Preenche o snapshot dos itens que já existem com a categoria atual do produto
-- (daqui para frente o snapshot é gravado quando o item é criado)
UPDATE "order_items" AS oi
SET "product_category_id_snapshot" = p."category_id"
FROM "products" AS p
WHERE oi."product_id" = p."id"
  AND oi."product_category_id_snapshot" IS NULL;
