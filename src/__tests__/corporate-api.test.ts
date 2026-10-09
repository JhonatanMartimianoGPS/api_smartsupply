import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

const BASE_URL = "http://localhost:3000";
const API_URL = `${BASE_URL}/api/v1`;

describe("GPS Bridge — Enterprise Backend Automated Integration Tests", () => {
  let adminToken = "";
  let colaboradorToken = "";

  it("1. Healthcheck (/health) deve retornar status healthy e uptime", async () => {
    const res = await fetch(`${BASE_URL}/health`);
    assert.strictEqual(res.status, 200);
    const data: any = await res.json();
    assert.strictEqual(data.status, "healthy");
    assert.ok(typeof data.uptimeSeconds === "number");
  });

  it("2. Readiness check (/ready) deve verificar conectividade ativa com o PostgreSQL", async () => {
    const res = await fetch(`${BASE_URL}/ready`);
    assert.strictEqual(res.status, 200);
    const data: any = await res.json();
    assert.strictEqual(data.status, "ready");
    assert.strictEqual(data.database, "connected");
  });

  it("3. Métricas de Runtime (/metrics) deve expor formato Prometheus", async () => {
    const res = await fetch(`${BASE_URL}/metrics`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get("content-type")?.includes("text/plain"));
    const text = await res.text();
    assert.ok(text.includes("process_uptime_seconds"));
    assert.ok(text.includes("db_up 1"));
  });

  it("4. Métricas de Runtime (/metrics) deve expor telemetria JSON quando solicitado", async () => {
    const res = await fetch(`${BASE_URL}/metrics`, {
      headers: { Accept: "application/json" },
    });
    assert.strictEqual(res.status, 200);
    const data: any = await res.json();
    assert.strictEqual(data.database.status, "connected");
    assert.ok(typeof data.uptimeSeconds === "number");
    assert.ok(typeof data.process.memory.heapUsedBytes === "number");
  });

  it("5. Documentação Swagger UI (/api-docs/) deve estar online", async () => {
    const res = await fetch(`${BASE_URL}/api-docs/`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get("content-type")?.includes("text/html"));
  });

  it("6. Auth: Deve rejeitar login com payload inválido via Zod schema (400)", async () => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nao-eh-um-email" }),
    });
    assert.strictEqual(res.status, 400);
    const data: any = await res.json();
    assert.strictEqual(data.status_code, 400);
    assert.ok(Array.isArray(data.details));
  });

  it("7. Auth: Deve rejeitar login com senha incorreta (401)", async () => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@gpssa.com.br", password: "senha-errada-123" }),
    });
    assert.strictEqual(res.status, 401);
  });

  it("8. Auth: Deve efetuar login com sucesso para super_admin e gerar tokens JWT", async () => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@gpssa.com.br", password: "admin123" }),
    });
    assert.strictEqual(res.status, 200);
    const data: any = await res.json();
    assert.ok(data.access_token);
    assert.strictEqual(data.user.email, "admin@gpssa.com.br");
    assert.strictEqual(data.user.role, "super_admin");
    adminToken = data.access_token;
  });

  it("9. Auth: Deve efetuar login de colaborador para testar RBAC", async () => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "colaborador@gpssa.com.br", password: "admin123" }),
    });
    assert.strictEqual(res.status, 200);
    const data: any = await res.json();
    assert.ok(data.access_token);
    assert.strictEqual(data.user.role, "colaborador");
    colaboradorToken = data.access_token;
  });

  it("10. RBAC: /auth/me deve retornar dados do usuário autenticado", async () => {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data: any = await res.json();
    assert.strictEqual(data.email, "admin@gpssa.com.br");
  });

  it("11. RBAC: Trilha de auditoria deve bloquear acesso de colaborador (403)", async () => {
    const res = await fetch(`${API_URL}/system/audit-logs`, {
      headers: { Authorization: `Bearer ${colaboradorToken}` },
    });
    assert.strictEqual(res.status, 403);
  });

  it("12. Governança: Super Admin pode consultar trilha de auditoria e constatar eventos", async () => {
    const res = await fetch(`${API_URL}/system/audit-logs?limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data: any = await res.json();
    assert.ok(typeof data.total === "number");
    assert.ok(data.total > 0);
    assert.ok(Array.isArray(data.logs));
    const loginLog = data.logs.find((l: any) => l.action === "LOGIN" && l.entity === "Auth");
    assert.ok(loginLog, "Log de LOGIN deve estar registrado na trilha de auditoria");
  });

  it("13. Estoque: Dashboard deve retornar KPIs numéricos consolidados", async () => {
    const res = await fetch(`${API_URL}/stock/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data: any = await res.json();
    assert.ok(typeof data.totalProdutos === "number");
    assert.ok(typeof data.totalCentros === "number");
    assert.ok(typeof data.totalEntradasValor === "number");
  });

  it("14. Estoque: Deve validar criação de produto via Zod schema (400 em caso de campos ausentes)", async () => {
    const res = await fetch(`${API_URL}/stock/produtos`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        codigo: "TESTE-ERRADO",
        // nome ausente
      }),
    });
    assert.strictEqual(res.status, 400);
    const data: any = await res.json();
    assert.strictEqual(data.status_code, 400);
  });

  it("15. Pedidos: Lista de pedidos mensais deve responder com 200 para usuário autenticado", async () => {
    const res = await fetch(`${API_URL}/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data: any = await res.json();
    assert.ok(Array.isArray(data));
  });
});
