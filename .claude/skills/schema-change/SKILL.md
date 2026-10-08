---
name: schema-change
description: Altera a estrutura do banco (novo model, coluna, índice, relação) em prisma/schema com cuidado, já que o histórico de migrations do projeto é inconsistente. Use quando o dev pedir para criar/alterar tabela, coluna ou índice.
argument-hint: <o que mudar, ex. "adicionar coluna phone em users">
---

# Alteração de banco: $ARGUMENTS

## 1. Entenda antes de mexer

- Procure o model em `prisma/schema/` (`Grep` por `@@map("<tabela>")`). Ele pode já existir.
- `prisma/schema/` é o modelo correto. `prisma/schema-prd-reference/` é só consulta do banco antigo: **não edite nem copie dela**.
- Verifique quem usa o model (`Grep` por `prisma.<model>` em `src/`) e se o frontend depende da forma dele (`client_smartsupply/src/api` e `src/types`).
- Explique ao dev, em uma frase, o que vai mudar no banco.
- Se a mudança mexe em Produto, preço, orçamento ou categoria, confira se ela não contradiz a visão futura (produto separado de tabela de preço, orçamento por conta contábil e competência). Se contradisser, avise antes.

## 2. Edite o schema

Coloque o model no **arquivo do domínio** dele em `prisma/schema/` (`products.prisma`, `orders.prisma`, `contracts.prisma`…). Model novo no padrão:

```prisma
model Thing {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  name      String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("things")
}
```

Model em PascalCase singular, tabela em snake_case plural via `@@map`, campos camelCase com `@map`. Lembre de adicionar o lado inverso da relação no outro model (ex.: em `users.prisma`).

**Coluna nova** em tabela que já tem dados: deve ser opcional (`String?`) ou ter `@default`, senão a mudança falha.

**Performance** — decida os índices agora, olhando como a tabela será consultada:
- toda foreign key ganha `@@index` (o PostgreSQL não cria sozinho);
- filtros frequentes combinados com ordenação → índice composto na ordem `[filtro, ordenação]`.

## 3. Valide o schema

```bash
npx prisma validate
```

## 4. Aplique no banco (com confirmação)

O histórico de `prisma/migrations/` **não é confiável**: há duas migrations "baseline" que conflitam e não existe `migration_lock.toml`. O banco local foi sincronizado com `prisma db push`.

Mostre ao dev o que mudou e **peça confirmação** antes de qualquer comando que altere o banco. Explique as opções e deixe ele escolher:
- `npm run prisma:push` — rápido, sem arquivo de migration (é o que vinha sendo usado em desenvolvimento). O `settings.json` **bloqueia** esse comando: o dev roda por conta própria ou libera a regra;
- `npm run prisma:migrate -- --name <descricao-curta-em-ingles>` — gera a migration, mas pode falhar por causa do histórico atual.

Depois rode `npm run prisma:generate`. Se gerou migration, leia o `migration.sql` e confira: não há `DROP` inesperado nem perda de dados. **Não edite migration já aplicada**: crie outra corrigindo.

Nunca rode `npx prisma migrate reset` nem `migrate deploy` sem o dev pedir.

## 5. Valide (obrigatório)

1. `npx tsc --noEmit` (o client gerado pode quebrar código que usa o model).
2. Delegue ao agente `db-reviewer`; corrija os itens 🔴.
3. Se o seed usa o model, confira `prisma/seed.ts`.
4. Resuma para o dev: o que mudou no banco, como foi aplicado e se o frontend precisa de ajuste.
