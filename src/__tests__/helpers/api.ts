import assert from "node:assert/strict";

/**
 * Apoio aos testes de contrato: chamam a API local (npm run dev) e conferem o formato das respostas
 * conforme docs/api-contract.md. Usuários do seed (senha admin123).
 */
export const API_URL = process.env.API_URL ?? "http://localhost:3000/api/v1";

export async function login(email: string, password = "admin123"): Promise<string> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(res.status, 200, `login de ${email} falhou`);
  const data: any = await res.json();
  return data.accessToken ?? data.access_token;
}

export async function api(token: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

const SNAKE = /^[a-z0-9]+(_[a-z0-9]+)*$|^_[a-z]+$/;

/** Toda chave da resposta (em qualquer nível) precisa estar em snake_case. */
export function assertSnakeKeys(value: unknown, path = "$"): void {
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertSnakeKeys(item, `${path}[${i}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      assert.match(key, SNAKE, `chave fora da convenção em ${path}: ${key}`);
      // Colunas JSON livres guardam o que o cliente mandou; não entram na regra
      if (["details", "metadata", "items_payload", "diff_before", "diff_after", "permissions"].includes(key)) continue;
      assertSnakeKeys(item, `${path}.${key}`);
    }
  }
}

/** As chaves esperadas pelo frontend precisam existir no objeto (o contrato por recurso). */
export function assertHasKeys(obj: Record<string, unknown>, keys: string[], what: string): void {
  const missing = keys.filter((k) => !(k in obj));
  assert.deepEqual(missing, [], `${what}: faltam as chaves ${missing.join(", ")}`);
}
