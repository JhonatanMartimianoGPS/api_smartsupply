import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { api, assertHasKeys, assertSnakeKeys, login } from "./helpers/api.js";

// Contrato de produtos, categorias, fornecedores e regionais (docs/api-contract.md)
describe("contrato: catálogo", () => {
  let token = "";
  before(async () => {
    token = await login("admin@gpssa.com.br");
  });

  it("produtos paginados e detalhe", async () => {
    const page = await api(token, "GET", "/products/paginated?page=1&pageSize=5");
    assert.equal(page.status, 200);
    assertSnakeKeys(page.data);
    assertHasKeys(page.data, ["items", "total", "page", "page_size", "total_pages"], "página");
    const p = page.data.items[0];
    assertHasKeys(p, ["id", "name", "codigo", "descricao", "unidade", "tabela", "category_id", "regional_id", "supplier_id", "image_url", "active", "created_at", "updated_at", "category", "regional", "supplier", "categoria", "fornecedor"], "produto");
    assert.equal(typeof p.tabela, "number", "tabela (preço) é número");
    assert.ok(!("valor_unitario" in p) && !("product_category_id" in p), "nomes antigos não saem mais");

    const one = await api(token, "GET", `/products/${p.id}`);
    assert.equal(one.status, 200);
    assertSnakeKeys(one.data);
    assertHasKeys(one.data, ["tabela", "category_id", "categoria", "fornecedor"], "detalhe");

    const list = await api(token, "GET", "/products");
    assert.equal(list.status, 200);
    assertSnakeKeys(list.data);
  });

  it("filtros, duplicados, histórico e mapas", async () => {
    const options = await api(token, "GET", "/products/filter-options");
    assert.equal(options.status, 200);
    assertSnakeKeys(options.data);
    assertHasKeys(options.data, ["suppliers", "tables", "categories"], "filtros");
    assert.ok(!("fornecedores" in options.data), "nome antigo não sai mais");

    const dup = await api(token, "GET", "/products/duplicate-index");
    assert.equal(dup.status, 200);
    assertHasKeys(dup.data, ["duplicate_product_ids", "duplicate_count_by_product_id", "duplicate_group_count", "duplicate_product_count"], "duplicados");

    const history = await api(token, "GET", "/products/history?limit=3");
    assert.equal(history.status, 200);
    assertSnakeKeys(history.data);

    const products = await api(token, "GET", "/products/paginated?page=1&pageSize=2");
    const ids = products.data.items.map((x: any) => x.id);
    const map = await api(token, "POST", "/products/contract-map", { productIds: ids });
    assert.equal(map.status, 200);
    for (const id of ids) assert.ok(Array.isArray(map.data[id]), "mapa chaveado pelo id do produto, como veio");

    const lookup = await api(token, "POST", "/products/import-duplicate-lookup", { codes: ["ABC", "TST-001"] });
    assert.equal(lookup.status, 200);
    assert.ok("ABC" in lookup.data, "códigos saem como foram enviados (maiúsculas preservadas)");
  });

  it("categorias, fornecedores e regionais", async () => {
    const pc = await api(token, "GET", "/categories/products");
    assert.equal(pc.status, 200);
    assertSnakeKeys(pc.data);
    if (pc.data.length) assertHasKeys(pc.data[0], ["id", "name", "code", "active", "created_at"], "categoria de produto");

    const cc = await api(token, "GET", "/categories/contracts");
    assert.equal(cc.status, 200);
    assertSnakeKeys(cc.data);
    if (cc.data.length) assertHasKeys(cc.data[0], ["id", "name", "color", "regional_id", "active"], "categoria de contrato");

    const suppliers = await api(token, "GET", "/suppliers");
    assert.equal(suppliers.status, 200);
    assertSnakeKeys(suppliers.data);
    assertHasKeys(suppliers.data[0], ["id", "name", "trade_name", "razao_social", "cnpj", "email", "phone", "telefone", "contato_nome", "observacoes", "active", "products_count", "regionals", "created_at"], "fornecedor");
    assert.ok(!("is_active" in suppliers.data[0]) && !("service_regionals" in suppliers.data[0]), "nomes antigos não saem mais");

    const regionals = await api(token, "GET", "/regionals");
    assert.equal(regionals.status, 200);
    assertSnakeKeys(regionals.data);
    assertHasKeys(regionals.data[0], ["id", "name", "code", "active"], "regional");
  });

  it("criação de produto com o corpo do modelo em snake_case", async () => {
    const regionals = await api(token, "GET", "/regionals");
    const suppliers = await api(token, "GET", "/suppliers");
    const created = await api(token, "POST", "/products", {
      name: "[contrato] Produto teste",
      codigo: "CTR-001",
      unidade: "UN",
      tabela: 12.5,
      regional_id: regionals.data[0].id,
      fornecedor: suppliers.data[0].name,
    });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    assertSnakeKeys(created.data);
    assert.equal(created.data.tabela, 12.5);
    assert.equal(created.data.supplier_id, suppliers.data[0].id, "fornecedor pelo nome vira supplier_id");
    assert.equal(created.data.fornecedor, suppliers.data[0].trade_name || suppliers.data[0].name);
    const removed = await api(token, "DELETE", `/products/${created.data.id}`);
    assert.equal(removed.status, 200);
  });
});
