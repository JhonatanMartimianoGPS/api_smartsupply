import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { api, assertHasKeys, assertSnakeKeys, login } from "./helpers/api.js";

// Contrato de solicitações especiais (docs/api-contract.md)
describe("contrato: solicitações", () => {
  let token = "";
  before(async () => {
    token = await login("admin@gpssa.com.br");
  });

  it("listagem, detalhe e histórico", async () => {
    const list = await api(token, "GET", "/solicitations");
    assert.equal(list.status, 200);
    assertSnakeKeys(list.data);
    const s = list.data.find((x: any) => x.items.length) ?? list.data[0];
    assertHasKeys(s, ["id", "contract_id", "created_by_id", "status", "step", "notes", "total_amount", "created_at", "updated_at", "contract", "created_by", "items"], "solicitação");
    assert.ok(!("solicitation_items" in s) && !("user_profile" in s) && !("user_id" in s), "nomes antigos não saem mais");
    assert.equal(typeof s.total_amount, "number");
    assertHasKeys(s.created_by, ["id", "name", "email"], "created_by");
    if (s.items.length) {
      assertHasKeys(s.items[0], ["id", "solicitation_id", "product_id", "quantity", "unit_price", "description", "product", "total"], "item");
      if (s.items[0].product) assertHasKeys(s.items[0].product, ["id", "name", "codigo", "unidade", "tabela", "categoria", "fornecedor"], "produto do item");
    }

    const one = await api(token, "GET", `/solicitations/${s.id}`);
    assert.equal(one.status, 200);
    assertSnakeKeys(one.data);
    assertHasKeys(one.data, ["items", "history"], "detalhe");

    const history = await api(token, "GET", `/solicitations/${s.id}/history`);
    assert.equal(history.status, 200);
    assertSnakeKeys(history.data);
    if (history.data.length) assertHasKeys(history.data[0], ["id", "solicitation_id", "user_id", "action", "step", "notes", "created_at", "user"], "histórico");
  });

  it("criação com o corpo em snake_case", async () => {
    const contracts = await api(token, "GET", "/contracts");
    const products = await api(token, "GET", "/products/paginated?page=1&pageSize=1");
    const created = await api(token, "POST", "/solicitations", {
      contract_id: contracts.data[0].id,
      items: [{ product_id: products.data.items[0].id, quantity: 2, unit_price: 3.5 }, { description: "Item avulso", quantity: 1, unit_price: 1 }],
      notes: "[contrato] teste",
    });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    assertSnakeKeys(created.data);
    assert.equal(created.data.total_amount, 8);
    assert.equal(created.data.items.length, 2);
    const items = await api(token, "PUT", `/solicitations/${created.data.id}/items`, { items: [{ product_id: products.data.items[0].id, quantity: 1, unit_price: 2 }] });
    assert.equal(items.status, 200);
    assertSnakeKeys(items.data);
    assert.equal(items.data[0].unit_price, 2);
    const closed = await api(token, "PATCH", `/solicitations/${created.data.id}/step`, { step: "rejeitado", status: "rejeitado" });
    assert.equal(closed.status, 200);
    const removed = await api(token, "DELETE", `/solicitations/${created.data.id}`);
    assert.equal(removed.status, 200);
  });
});
