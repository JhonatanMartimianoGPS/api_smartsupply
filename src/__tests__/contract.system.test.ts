import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { api, assertHasKeys, assertSnakeKeys, login } from "./helpers/api.js";

// Contrato de sistema e usuários (docs/api-contract.md)
describe("contrato: sistema e usuários", () => {
  let token = "";
  before(async () => {
    token = await login("admin@gpssa.com.br");
  });

  it("módulos e categorias de módulos", async () => {
    const modules = await api(token, "GET", "/system/modules");
    assert.equal(modules.status, 200);
    assertSnakeKeys(modules.data);
    assertHasKeys(modules.data[0], ["id", "name", "description", "category", "enabled", "icon", "route", "badge", "roles", "updated_by_id", "created_at", "updated_at"], "módulo");

    const categories = await api(token, "GET", "/system/module-categories");
    assert.equal(categories.status, 200);
    assertSnakeKeys(categories.data);
    assertHasKeys(categories.data[0], ["id", "label", "description", "color", "sort_order", "created_at", "updated_at"], "categoria de módulo");

    // toggle recebe o nome do modelo
    const off = await api(token, "PATCH", "/system/modules/chamados/toggle", { enabled: false });
    assert.equal(off.status, 200);
    assert.equal(off.data.enabled, false);
    const on = await api(token, "PATCH", "/system/modules/chamados/toggle", { enabled: true });
    assert.equal(on.data.enabled, true);
    const bad = await api(token, "PATCH", "/system/modules/chamados/toggle", { is_enabled: true });
    assert.equal(bad.status, 400, "a grafia antiga não vale mais");
  });

  it("equipe e presença", async () => {
    const team = await api(token, "GET", "/system/team-members");
    assert.equal(team.status, 200);
    assertSnakeKeys(team.data);
    if (team.data.length) assertHasKeys(team.data[0], ["id", "name", "role", "email", "phone", "avatar_url", "regional_id", "active"], "membro da equipe");

    const presence = await api(token, "GET", "/system/presence/active");
    assert.equal(presence.status, 200);
    assertSnakeKeys(presence.data);
  });

  it("usuários: listagem e ações administrativas com corpo em snake_case", async () => {
    const list = await api(token, "GET", "/users");
    assert.equal(list.status, 200);
    assertSnakeKeys(list.data);
    assertHasKeys(list.data[0], ["id", "email", "name", "role", "is_active", "is_blocked", "regional_ids", "contract_ids", "regionals", "contracts", "created_at"], "usuário");
    assert.ok(!("password_hash" in list.data[0]), "passwordHash nunca sai");

    const email = "contrato.teste@gpssa.com.br";
    const regionalId = list.data.find((u: any) => u.regional_ids.length)?.regional_ids[0];
    const created = await api(token, "POST", "/system/admin-actions/create-user", {
      email,
      password: "Senha@123",
      full_name: "Contrato Teste",
      role: "assistente",
      regional_ids: regionalId ? [regionalId] : [],
    });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    assertSnakeKeys(created.data);
    assert.equal(created.data.data.name, "Contrato Teste");
    const renamed = await api(token, "POST", "/system/admin-actions/update-profile", { target_user_id: created.data.data.id, full_name: "Contrato Renomeado" });
    assert.equal(renamed.status, 200);
    assert.equal(renamed.data.data.name, "Contrato Renomeado");
    const removed = await api(token, "POST", "/system/admin-actions/delete-user", { target_user_id: created.data.data.id });
    assert.equal(removed.status, 200);
  });
});
