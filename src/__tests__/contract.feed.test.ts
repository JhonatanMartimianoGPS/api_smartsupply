import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { api, assertHasKeys, assertSnakeKeys, login } from "./helpers/api.js";

// Contrato do mural (docs/api-contract.md). Só leitura: criar post avisa todos os usuários.
describe("contrato: mural", () => {
  let token = "";
  before(async () => {
    token = await login("admin@gpssa.com.br");
  });

  it("publicações paginadas e comentários com os nomes do modelo", async () => {
    const list = await api(token, "GET", "/feed/posts?page=1&pageSize=5");
    assert.equal(list.status, 200);
    assertSnakeKeys(list.data);
    assertHasKeys(list.data, ["items", "total", "page", "page_size", "total_pages"], "lista de publicações");
    assert.ok(!("posts" in list.data) && !("totalPages" in list.data), "nomes antigos não saem mais");
    if (list.data.items.length) {
      const post = list.data.items[0];
      assertHasKeys(post, ["id", "user_id", "title", "content", "image_url", "pinned", "created_at", "updated_at", "user", "likes_count", "comments_count", "has_liked"], "publicação");
      assert.ok(!("author" in post), "autor vai em user");
      assertHasKeys(post.user, ["id", "name", "role", "avatar_url"], "autor");
      assert.equal(typeof post.has_liked, "boolean");

      const comments = await api(token, "GET", `/feed/posts/${post.id}/comments`);
      assert.equal(comments.status, 200);
      assertSnakeKeys(comments.data);
      if (comments.data.length) assertHasKeys(comments.data[0], ["id", "post_id", "user_id", "content", "created_at", "user"], "comentário");
    }
  });
});
