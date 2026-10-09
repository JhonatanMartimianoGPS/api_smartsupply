import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { API_URL, api, assertHasKeys, assertSnakeKeys } from "./helpers/api.js";

const SESSION_USER_KEYS = ["id", "email", "name", "role", "avatar_url", "is_active", "is_blocked", "regional_ids", "contract_ids", "regionals", "contracts", "created_at"];

async function postLogin(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return { status: res.status, data: await res.json() };
}

// Contrato de autenticação e do envelope de erro (docs/api-contract.md)
describe("contrato: autenticação e erros", () => {
  it("login, me e refresh em snake_case", async () => {
    const login = await postLogin("admin@gpssa.com.br", "admin123");
    assert.equal(login.status, 200, JSON.stringify(login.data));
    assertSnakeKeys(login.data);
    assertHasKeys(login.data, ["access_token", "refresh_token", "user"], "login");
    assert.ok(!("accessToken" in login.data), "nomes antigos não saem mais");
    assertHasKeys(login.data.user, SESSION_USER_KEYS, "usuário da sessão");
    assert.ok(!("password_hash" in login.data.user), "senha nunca sai");

    const me = await api(login.data.access_token, "GET", "/auth/me");
    assert.equal(me.status, 200);
    assertSnakeKeys(me.data);
    assert.equal(me.data.id, login.data.user.id);
    assertHasKeys(me.data, SESSION_USER_KEYS, "me");

    const refreshed = await api("", "POST", "/auth/refresh", { refresh_token: login.data.refresh_token });
    assert.equal(refreshed.status, 200, JSON.stringify(refreshed.data));
    assertSnakeKeys(refreshed.data);
    assertHasKeys(refreshed.data, ["access_token", "refresh_token"], "refresh");
  });

  it("envelope de erro { status_code, message, error }", async () => {
    const wrong = await postLogin("admin@gpssa.com.br", "senha-errada");
    assert.equal(wrong.status, 401);
    assertHasKeys(wrong.data, ["status_code", "message", "error"], "erro de login");
    assert.equal(wrong.data.status_code, 401);
    assert.ok(!("statusCode" in wrong.data), "nome antigo não sai mais");

    const invalid = await api("", "POST", "/auth/refresh", {});
    assert.equal(invalid.status, 400);
    assert.equal(invalid.data.status_code, 400);
    assert.match(invalid.data.message, /refresh_token/);
    assert.ok(Array.isArray(invalid.data.details), "erro de validação traz details");

    const unauth = await api("", "GET", "/auth/me");
    assert.equal(unauth.status, 401);
    assert.equal(unauth.data.status_code, 401);

    const token = (await postLogin("admin@gpssa.com.br", "admin123")).data.access_token;
    const missing = await api(token, "GET", "/orders/00000000-0000-0000-0000-000000000000");
    assert.equal(missing.status, 404);
    assertHasKeys(missing.data, ["status_code", "message", "error"], "erro 404");
  });
});
