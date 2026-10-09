import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { serialize, toCamelCase, toSnakeKey, toCamelKey } from "../lib/serialize.js";

describe("serialize: convenção snake_case da API", () => {
  it("traduz as chaves do modelo para snake_case, inclusive aninhadas e em listas", () => {
    const out = serialize<any>({
      createdById: "u1",
      createdBy: { id: "u1", name: "Ana" },
      items: [{ productNameSnapshot: "Luva", unitPrice: new Prisma.Decimal("10.50") }],
    });
    assert.deepEqual(out, {
      created_by_id: "u1",
      created_by: { id: "u1", name: "Ana" },
      items: [{ product_name_snapshot: "Luva", unit_price: 10.5 }],
    });
  });

  it("converte Decimal em número e Date em ISO", () => {
    const out = serialize<any>({ totalAmount: new Prisma.Decimal("1348.00"), createdAt: new Date("2026-10-08T12:00:00Z") });
    assert.equal(out.total_amount, 1348);
    assert.equal(out.created_at, "2026-10-08T12:00:00.000Z");
  });

  it("não mexe dentro de colunas JSON livres; chaves que começam com _ ficam, mas o conteúdo segue a regra", () => {
    const out = serialize<any>({ _count: { orderItems: 2 }, details: { changedFields: ["x"], before: { unitPrice: 1 } } });
    assert.deepEqual(out, { _count: { order_items: 2 }, details: { changedFields: ["x"], before: { unitPrice: 1 } } });
  });

  it("deixa chaves já em snake_case como estão e descarta undefined", () => {
    const out = serialize<any>({ regional_id: "r1", competence_month: "2026-10-01", nada: undefined });
    assert.deepEqual(out, { regional_id: "r1", competence_month: "2026-10-01" });
  });

  it("corpo de entrada: snake_case vira camelCase e as duas grafias juntas não perdem o valor", () => {
    assert.deepEqual(toCamelCase<any>({ contract_id: "c1", items: [{ product_id: "p1", unit_price: 2 }] }), {
      contractId: "c1",
      items: [{ productId: "p1", unitPrice: 2 }],
    });
    assert.deepEqual(toCamelCase<any>({ contractId: null, contract_id: "c1" }), { contractId: "c1" });
    assert.deepEqual(toCamelCase<any>({ contract_id: "c1", contractId: null }), { contractId: "c1" });
  });

  it("chaves dinâmicas (uuid, contrato_mês, índice) não são traduzidas", () => {
    const out = serialize<any>({ "8b564a3b-75a0_2026-10-01": { monthlyBudget: 1 }, "0": [{ codigoX: 1 }] });
    assert.deepEqual(out, { "8b564a3b-75a0_2026-10-01": { monthly_budget: 1 }, "0": [{ codigo_x: 1 }] });
  });

  it("chaves: ida e volta", () => {
    assert.equal(toSnakeKey("productCodigoSnapshot"), "product_codigo_snapshot");
    assert.equal(toSnakeKey("imageURL"), "image_url");
    assert.equal(toCamelKey("product_category_id_snapshot"), "productCategoryIdSnapshot");
    assert.equal(toCamelKey("_count"), "_count");
  });
});
