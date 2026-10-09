import { Prisma } from "@prisma/client";

/**
 * Convenção da API (docs/api-contract.md): na resposta, toda chave é o nome do campo do modelo
 * Prisma em snake_case; no corpo de entrada, o cliente envia snake_case e o service recebe camelCase.
 *
 * Estas funções fazem essa tradução de forma mecânica:
 * - chaves: createdById <-> created_by_id; chaves que começam com "_" (ex.: _count) ficam como estão
 * - Decimal do Prisma vira número; Date vira texto ISO
 * - colunas JSON livres (RAW_KEYS) passam intactas: o que foi gravado é devolvido igual
 */

// Chaves cujo conteúdo é JSON livre: não traduzimos o que há dentro delas
const RAW_KEYS = new Set(["details", "metadata", "items_payload", "diff_before", "diff_after", "permissions"]);

export function toSnakeKey(key: string): string {
  if (key.startsWith("_")) return key;
  return key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

export function toCamelKey(key: string): string {
  if (key.startsWith("_")) return key;
  return key.replace(/_([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function convert(value: unknown, keyFn: (key: string) => string): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (Prisma.Decimal.isDecimal(value)) return Number(value);
  if (Array.isArray(value)) return value.map((item) => convert(item, keyFn));
  if (!isPlainObject(value)) return value; // Buffer, Map etc.: devolvidos como estão

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined) continue;
    const newKey = keyFn(key);
    // Se duas grafias da mesma chave chegarem juntas (contractId e contract_id), vale a que tem valor
    if (newKey in out && item === null) continue;
    out[newKey] = RAW_KEYS.has(newKey) || RAW_KEYS.has(key) ? item : convert(item, keyFn);
  }
  return out;
}

/** Resposta da API: objeto do Prisma (ou qualquer objeto) com chaves em snake_case. */
export function serialize<T = unknown>(value: unknown): T {
  return convert(value, toSnakeKey) as T;
}

/** Corpo de entrada: chaves em snake_case (ou camelCase) viram camelCase, como o service espera. */
export function toCamelCase<T = unknown>(value: unknown): T {
  return convert(value, toCamelKey) as T;
}
