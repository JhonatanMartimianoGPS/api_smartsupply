import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { api, assertHasKeys, assertSnakeKeys, login } from "./helpers/api.js";

// Contrato de pedidos (docs/api-contract.md)
describe("contrato: pedidos", () => {
  let token = "";
  before(async () => {
    token = await login("admin@gpssa.com.br");
  });

  it("listagem, detalhe, itens e histórico", async () => {
    const list = await api(token, "GET", "/orders");
    assert.equal(list.status, 200);
    assertSnakeKeys(list.data);
    const o = list.data.find((x: any) => x.items?.length) ?? list.data[0];
    assertHasKeys(o, ["id", "created_by_id", "contract_id", "status", "mes", "ano", "is_extra_order", "notes", "total_amount", "competence_month", "created_at", "updated_at", "contract", "created_by", "items", "history"], "pedido");
    assert.ok(!("user_id" in o) && !("user_profile" in o) && !("total" in o) && !("totalAmount" in o), "nomes antigos não saem mais");
    assert.equal(typeof o.total_amount, "number");
    assert.match(o.competence_month, /^\d{4}-\d{2}-01$/);
    assertHasKeys(o.contract, ["id", "name", "regional_id", "category_id", "total_budget", "used_budget", "budget_locked", "allow_extra_order", "unlimited_budget"], "contrato do pedido");
    assertHasKeys(o.created_by, ["id", "name"], "created_by");
    if (o.items.length) {
      assertHasKeys(o.items[0], ["id", "order_id", "product_id", "quantity", "unit_price", "total", "product_name_snapshot", "product_codigo_snapshot", "product_unidade_snapshot", "product_categoria_snapshot", "product_fornecedor_snapshot", "product"], "item");
      assert.equal(typeof o.items[0].unit_price, "number");
      if (o.items[0].product) assertHasKeys(o.items[0].product, ["id", "name", "codigo", "unidade", "tabela", "categoria", "fornecedor", "image_url"], "produto do item");
    }

    const one = await api(token, "GET", `/orders/${o.id}`);
    assert.equal(one.status, 200);
    assertSnakeKeys(one.data);
    assertHasKeys(one.data, ["items", "history"], "detalhe");

    const items = await api(token, "POST", "/orders/items/query", { order_ids: [o.id] });
    assert.equal(items.status, 200);
    assertSnakeKeys(items.data);
    if (items.data.length) assertHasKeys(items.data[0], ["id", "order_id", "product_id", "quantity", "unit_price", "total", "product"], "item em lote");

    const history = await api(token, "GET", `/orders/${o.id}/history`);
    assert.equal(history.status, 200);
    assertSnakeKeys(history.data);
    if (history.data.length) assertHasKeys(history.data[0], ["id", "order_id", "user_id", "action", "details", "created_at", "user_name"], "histórico");
  });

  it("pedidos do mês ativo, divergências e relatos", async () => {
    const active = await api(token, "GET", "/orders/active-month");
    assert.equal(active.status, 200);
    assertSnakeKeys(active.data);
    if (active.data.length) {
      assertHasKeys(active.data[0], ["id", "created_by_id", "contract_id", "status", "total_amount", "items_count", "competence_month", "contract", "created_by", "created_at"], "pedido do mês");
      assert.ok(!("order_id" in active.data[0]) && !("contract_name" in active.data[0]), "a linha é o pedido, sem campos achatados");
      assertHasKeys(active.data[0].contract, ["id", "name", "regional", "category"], "contrato do pedido do mês");
    }

    const divergences = await api(token, "GET", "/orders/delivery-divergences");
    assert.equal(divergences.status, 200);
    assertSnakeKeys(divergences.data);
    if (divergences.data.length) {
      assertHasKeys(divergences.data[0], ["id", "order_id", "reported_by_id", "description", "status", "notes", "resolved_at", "created_at", "updated_at", "competence_month", "reporter_name", "contract", "order"], "divergência");
      assert.ok(["pendente", "resolvida"].includes(divergences.data[0].status), "status do modelo");
      assert.ok(!("observacao" in divergences.data[0]) && !("reported_by" in divergences.data[0]), "nomes antigos não saem mais");
    }

    const issues = await api(token, "GET", "/orders/issue-reports");
    assert.equal(issues.status, 200);
    assertSnakeKeys(issues.data);
    if (issues.data.length) assertHasKeys(issues.data[0], ["id", "order_id", "reported_by_id", "description", "status", "notes", "created_at", "competence_month", "contract_id", "order"], "relato");
  });

  it("criação, edição de itens e exclusão com o corpo em snake_case", async () => {
    const contracts = await api(token, "GET", "/contracts");
    const contract = contracts.data.find((c: any) => c.allow_extra_order) ?? contracts.data[0];
    const products = await api(token, "GET", `/contracts/${contract.id}/products`);
    assert.ok(products.data.length, "contrato sem produtos para o teste");
    const product = products.data[0];

    // Pedido extra: não disputa a competência mensal do contrato com pedidos já existentes
    const created = await api(token, "POST", "/orders/extra", {
      contract_id: contract.id,
      justification: "[contrato] teste",
      items: [{ product_id: product.id, quantity: 2 }],
    });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    assertSnakeKeys(created.data);
    assert.equal(created.data.is_extra_order, true);
    assert.equal(created.data.items.length, 1);
    assert.equal(created.data.items[0].total, created.data.total_amount);

    const updated = await api(token, "PUT", `/orders/${created.data.id}/items`, {
      items: [{ product_id: product.id, quantity: 3, unit_price: Number(product.tabela) }],
    });
    assert.equal(updated.status, 200, JSON.stringify(updated.data));
    assertHasKeys(updated.data, ["order_id", "new_total"], "resultado da edição");
    assert.equal(updated.data.new_total, Number(product.tabela) * 3);

    const entry = await api(token, "POST", `/orders/${created.data.id}/history`, { action: "test", details: "[contrato] teste" });
    assert.equal(entry.status, 200, JSON.stringify(entry.data));
    assertHasKeys(entry.data, ["id", "order_id", "user_id", "action", "details", "created_at"], "entrada do histórico");

    const invalid = await api(token, "POST", "/orders/extra", { contract_id: contract.id, items: [{ quantity: 1 }] });
    assert.equal(invalid.status, 400);
    assert.match(invalid.data.message, /product_id/);

    const removed = await api(token, "DELETE", `/orders/${created.data.id}`);
    assert.equal(removed.status, 200);
    assertHasKeys(removed.data, ["order_id"], "resultado da exclusão");
  });

  it("query params em snake_case (camelCase ainda aceito)", async () => {
    const all = await api(token, "GET", "/orders");
    const contractId = all.data[0]?.contract_id;
    assert.ok(contractId, "sem pedidos para filtrar");
    const snake = await api(token, "GET", `/orders?contract_id=${contractId}`);
    const camel = await api(token, "GET", `/orders?contractId=${contractId}`);
    assert.equal(snake.status, 200);
    assert.ok(snake.data.length > 0 && snake.data.every((o: any) => o.contract_id === contractId), "filtro por contract_id");
    assert.deepEqual(snake.data.map((o: any) => o.id), camel.data.map((o: any) => o.id), "as duas grafias filtram igual");
  });
});
