import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { api, assertHasKeys, assertSnakeKeys, login } from "./helpers/api.js";

// Contrato do dashboard (docs/api-contract.md): chaves em snake_case e os campos que as telas leem
describe("contrato: dashboard", () => {
  let token = "";
  before(async () => {
    token = await login("admin@gpssa.com.br");
  });

  it("order-stats", async () => {
    const { status, data } = await api(token, "GET", "/dashboard/order-stats?periodMonth=all");
    assert.equal(status, 200);
    assertSnakeKeys(data);
    assertHasKeys(data, ["total_orders", "pending_orders", "approved_orders", "delivered_orders", "rejected_orders", "extra_orders", "total_spent", "approved_rate"], "order-stats");
  });

  it("contract-spending", async () => {
    const { status, data } = await api(token, "GET", "/dashboard/contract-spending?periodMonth=all");
    assert.equal(status, 200);
    assertSnakeKeys(data);
    assert.ok(Array.isArray(data) && data.length > 0, "precisa de contratos no seed");
    assertHasKeys(data[0], ["contract_id", "contract_name", "regional_name", "category_id", "category_name", "category_color", "category_regional_name", "total_budget", "total_spent", "remaining_budget", "percentage", "budget_locked", "orders_count"], "contract-spending");
  });

  it("monthly-spending e category-spending", async () => {
    const monthly = await api(token, "GET", "/dashboard/monthly-spending");
    assert.equal(monthly.status, 200);
    assertSnakeKeys(monthly.data);
    if (monthly.data.length) assertHasKeys(monthly.data[0], ["month", "month_label", "total_spent", "orders_count"], "monthly-spending");

    const category = await api(token, "GET", "/dashboard/category-spending?periodMonth=all");
    assert.equal(category.status, 200);
    assertSnakeKeys(category.data);
    if (category.data.length) assertHasKeys(category.data[0], ["category_id", "category_name", "category_regional_name", "color", "total_budget", "total_spent", "orders_count", "percentage"], "category-spending");
  });

  it("product-supplier-spending e approval-history", async () => {
    const ranking = await api(token, "GET", "/dashboard/product-supplier-spending?periodMonth=all");
    assert.equal(ranking.status, 200);
    assertSnakeKeys(ranking.data);
    assertHasKeys(ranking.data, ["top_products", "top_suppliers"], "ranking");
    if (ranking.data.top_products.length) assertHasKeys(ranking.data.top_products[0], ["product_id", "product_name", "product_code", "category", "total_quantity", "total_spent", "contract_count"], "top_products");
    if (ranking.data.top_suppliers.length) assertHasKeys(ranking.data.top_suppliers[0], ["supplier_name", "total_spent", "total_quantity", "orders_count"], "top_suppliers");

    const history = await api(token, "GET", "/dashboard/approval-history?monthKey=all");
    assert.equal(history.status, 200);
    assertSnakeKeys(history.data);
    if (history.data.length) assertHasKeys(history.data[0], ["id", "action", "created_at", "order_id", "user_id", "details"], "approval-history");
  });
});
