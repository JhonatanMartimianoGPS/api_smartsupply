import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { api, assertHasKeys, assertSnakeKeys, login } from "./helpers/api.js";

// Contrato de contratos e orçamento (docs/api-contract.md)
describe("contrato: contratos e orçamento", () => {
  let token = "";
  let contractId = "";
  before(async () => {
    token = await login("admin@gpssa.com.br");
    const list = await api(token, "GET", "/contracts");
    contractId = list.data[0].id;
  });

  it("listagem e detalhe", async () => {
    const list = await api(token, "GET", "/contracts");
    assert.equal(list.status, 200);
    assertSnakeKeys(list.data);
    assertHasKeys(list.data[0], ["id", "name", "code", "regional_id", "category_id", "total_budget", "used_budget", "unlimited_budget", "allow_extra_order", "allow_custom_prices", "allow_unlimited_items_solicitation", "max_items_per_solicitation", "budget_locked", "active", "created_at", "updated_at", "regional", "category"], "contrato");
    assert.equal(typeof list.data[0].total_budget, "number", "Decimal vira número");

    const one = await api(token, "GET", `/contracts/${contractId}`);
    assert.equal(one.status, 200);
    assertSnakeKeys(one.data);
    assertHasKeys(one.data, ["monthly_total_budget", "monthly_used_budget", "monthly_budget_locked", "current_budget_period", "subbudgets"], "detalhe do contrato");
    if (one.data.current_budget_period) assert.match(one.data.current_budget_period.period_month, /^\d{4}-\d{2}-01$/);
  });

  it("períodos orçamentários (histórico e lote)", async () => {
    const history = await api(token, "GET", `/contracts/${contractId}/budget-periods`);
    assert.equal(history.status, 200);
    assertSnakeKeys(history.data);
    if (history.data.length) {
      assertHasKeys(history.data[0], ["id", "contract_id", "period_month", "monthly_budget", "used_budget", "budget_locked", "created_at", "updated_at"], "período");
      assert.match(history.data[0].period_month, /^\d{4}-\d{2}-01$/);
      assert.equal(typeof history.data[0].monthly_budget, "number");

      const month = history.data[0].period_month;
      const batch = await api(token, "POST", "/contracts/budget-periods/batch", { entries: [{ contractId, periodMonth: month }] });
      assert.equal(batch.status, 200);
      const key = `${contractId}_${month}`;
      assert.ok(key in batch.data, "a chave do lote fica como o cliente mandou");
      assertSnakeKeys(batch.data[key]);
      assertHasKeys(batch.data[key], ["period_month", "monthly_budget", "used_budget", "budget_locked"], "lote");
    }
  });

  it("suborçamentos, detalhamento de gastos, último pedido e produtos", async () => {
    const subs = await api(token, "GET", `/contracts/${contractId}/sub-budgets`);
    assert.equal(subs.status, 200);
    assertSnakeKeys(subs.data);
    if (subs.data.length) assertHasKeys(subs.data[0], ["id", "contract_id", "product_category_id", "monthly_budget", "active", "deactivated_at", "created_at", "updated_at"], "suborçamento");

    const periods = await api(token, "GET", `/contracts/${contractId}/sub-budgets/periods`);
    assert.equal(periods.status, 200);
    assertSnakeKeys(periods.data);
    if (periods.data.length) assertHasKeys(periods.data[0], ["id", "contract_product_category_budget_id", "contract_id", "product_category_id", "period_month", "monthly_budget", "used_budget"], "período do suborçamento");

    const breakdown = await api(token, "GET", `/contracts/${contractId}/budget-breakdown`);
    assert.equal(breakdown.status, 200);
    assertSnakeKeys(breakdown.data);
    assertHasKeys(breakdown.data, ["monthly_orders_sum", "extra_orders_sum", "solicitations_sum", "service_tickets_sum"], "detalhamento");

    const last = await api(token, "GET", `/contracts/${contractId}/last-historical-order`);
    assert.equal(last.status, 200);
    if (last.data) {
      assertSnakeKeys(last.data);
      assertHasKeys(last.data.items[0], ["id", "product_id", "quantity", "unit_price", "product_name"], "item do último pedido");
    }

    const products = await api(token, "GET", `/contracts/${contractId}/products`);
    assert.equal(products.status, 200);
    assertSnakeKeys(products.data);
  });
});
