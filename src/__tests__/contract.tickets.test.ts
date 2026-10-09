import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { api, assertHasKeys, assertSnakeKeys, login } from "./helpers/api.js";

// Contrato de chamados (docs/api-contract.md)
describe("contrato: chamados", () => {
  let token = "";
  let contractId = "";
  before(async () => {
    token = await login("admin@gpssa.com.br");
    const contracts = await api(token, "GET", "/contracts");
    contractId = contracts.data[0].id;
  });

  it("listagem, detalhe, tipos e fluxos", async () => {
    const list = await api(token, "GET", "/tickets");
    assert.equal(list.status, 200);
    assertSnakeKeys(list.data);
    if (list.data.length) {
      const t = list.data[0];
      assertHasKeys(t, ["id", "title", "description", "contract_id", "regional_id", "type_id", "flow_id", "supplier_id", "created_by_id", "status", "priority", "sla_hours", "final_cost", "auto_sync_cost", "created_at", "contract", "regional", "type", "created_by", "steps", "products", "counts"], "chamado");
      assert.ok(!("service_ticket_steps" in t) && !("user_id" in t) && !("ticketId" in t), "nomes antigos não saem mais");
      const one = await api(token, "GET", `/tickets/${t.id}`);
      assert.equal(one.status, 200);
      assertSnakeKeys(one.data);
      assertHasKeys(one.data, ["steps", "messages", "attachments", "products"], "detalhe");
    }
    const types = await api(token, "GET", "/tickets/types");
    assert.equal(types.status, 200);
    assertSnakeKeys(types.data);
    if (types.data.length) assertHasKeys(types.data[0], ["id", "name", "sla_hours", "active"], "tipo");
    const flows = await api(token, "GET", "/tickets/flows");
    assert.equal(flows.status, 200);
    assertSnakeKeys(flows.data);
  });

  it("fluxo completo com corpo em snake_case: abrir, atender, etapa, mensagem, produto, custo", async () => {
    const created = await api(token, "POST", "/tickets", { contract_id: contractId, title: "[contrato] chamado", description: "descrição de teste do contrato", priority: "urgente" });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    assertSnakeKeys(created.data);
    assert.equal(created.data.priority, "urgente");
    const id = created.data.id;

    const flows = await api(token, "GET", "/tickets/flows");
    if (flows.data.length) {
      const attended = await api(token, "POST", `/tickets/${id}/attend`, { flow_id: flows.data[0].id, supplier_name_snapshot: "Fornecedor X" });
      assert.equal(attended.status, 200, JSON.stringify(attended.data));
      assert.equal(attended.data.flow_id, flows.data[0].id);
      assert.equal(attended.data.supplier_name_snapshot, "Fornecedor X");
    }

    const step = await api(token, "POST", `/tickets/${id}/steps`, { title: "Comprar peça" });
    assert.equal(step.status, 201, JSON.stringify(step.data));
    assertSnakeKeys(step.data);
    assertHasKeys(step.data, ["id", "ticket_id", "title", "completed", "order", "completed_at", "completed_by"], "etapa");
    const done = await api(token, "PATCH", `/tickets/steps/${step.data.id}/toggle`, { completed: true });
    assert.equal(done.status, 200);
    assert.equal(done.data.completed, true);
    const old = await api(token, "PATCH", `/tickets/steps/${step.data.id}/toggle`, { is_completed: false });
    assert.equal(old.data.completed, false, "sem `completed` no corpo a etapa inverte (a grafia antiga é ignorada)");

    const msg = await api(token, "POST", `/tickets/${id}/messages`, { message: "Olá", is_internal: true });
    assert.equal(msg.status, 201);
    assertSnakeKeys(msg.data);
    assertHasKeys(msg.data, ["id", "ticket_id", "user_id", "message", "is_internal", "created_at", "user"], "mensagem");
    assert.equal(msg.data.is_internal, true);

    const cost = await api(token, "PATCH", `/tickets/${id}/cost`, { auto_sync_cost: true, final_cost: 0 });
    assert.equal(cost.status, 200);
    const products = await api(token, "GET", "/products/paginated?page=1&pageSize=1");
    const prod = await api(token, "POST", `/tickets/${id}/products`, { product_id: products.data.items[0].id, quantity: 2, unit_price: 10 });
    assert.equal(prod.status, 201, JSON.stringify(prod.data));
    assertSnakeKeys(prod.data);
    assertHasKeys(prod.data, ["id", "ticket_id", "product_id", "product_name_snapshot", "product_code_snapshot", "quantity", "unit_price", "total_price", "notes"], "produto do chamado");
    assert.equal(prod.data.total_price, 20);
    const after = await api(token, "GET", `/tickets/${id}`);
    assert.equal(after.data.final_cost, 20, "custo sincronizado");

    const removed = await api(token, "DELETE", `/tickets/${id}`);
    assert.equal(removed.status, 200);
  });
});
