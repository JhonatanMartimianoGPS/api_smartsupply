import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { api, assertHasKeys, assertSnakeKeys, login } from "./helpers/api.js";

// Contrato de notificações (docs/api-contract.md)
describe("contrato: notificações", () => {
  let token = "";
  before(async () => {
    token = await login("admin@gpssa.com.br");
  });

  it("listagem com os nomes do modelo", async () => {
    const list = await api(token, "GET", "/notifications");
    assert.equal(list.status, 200);
    assert.ok(Array.isArray(list.data));
    assertSnakeKeys(list.data);
    if (list.data.length) {
      const n = list.data[0];
      assertHasKeys(n, ["id", "user_id", "ticket_id", "type", "title", "message", "link", "is_read", "created_at"], "notificação");
      assert.ok(!("read" in n) && !("link_url" in n) && !("metadata" in n), "nomes antigos não saem mais");
      assert.equal(typeof n.is_read, "boolean");
    }
  });

  it("marcar como lida responde { success }", async () => {
    // Id inexistente: valida o formato da resposta sem mexer nas notificações reais
    const one = await api(token, "PATCH", "/notifications/00000000-0000-0000-0000-000000000000/read");
    assert.equal(one.status, 200);
    assert.deepEqual(one.data, { success: true });
    const ticket = await api(token, "PATCH", "/notifications/ticket/00000000-0000-0000-0000-000000000000/read");
    assert.equal(ticket.status, 200);
    assert.deepEqual(ticket.data, { success: true });
  });
});
