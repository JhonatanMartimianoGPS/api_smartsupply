# Contrato da API (nomes de campos)

Este documento é o acordo entre `api_smartsupply` e `client_smartsupply`. Os dois repositórios são separados e **não há checagem de tipo entre eles**: se um lado muda um nome e o outro não, a tela quebra sem aviso. Por isso a regra abaixo é única e simples.

## Regra

**Status**: vale para **código novo**. A migração dos recursos existentes é gradual e sem prazo: primeiro o sistema funciona, depois padronizamos (tabela de situação abaixo). Enquanto isso, quando uma tela quebrar por nome de campo, a correção mínima é adaptar essa tela, sem mexer no resto.

> **O nome do campo no JSON é o nome do campo no modelo Prisma (`prisma/schema/`), em camelCase, na resposta e no corpo enviado.**

- Banco: `avatar_url` → Prisma: `avatarUrl` → JSON: `avatarUrl`.
- Relações viram objeto aninhado com a mesma regra (`order.contract.regional.name`).
- O service devolve o objeto do Prisma. Para esconder campo sensível, use `select` (nunca `passwordHash`).
- **Não crie campo duplicado** (`regionalId` e `regional_id` juntos). Foi o que mascarou as divergências até agora.
- Datas em ISO 8601, valores monetários como número.
- O `period_month` de orçamento é a exceção de formato já conhecida: `YYYY-MM-01` (data), porque o front compara datas.

## Campos calculados

Não existem no Prisma, então ficam em camelCase e **precisam estar listados abaixo**: `itemsCount`, `total`, `categoryName`, `contractName`, `regionalName`, `totalAmount` (pedido), `hasLiked`, `likesCount`, `commentsCount`, `counts` (chamado).

## Exceção: estoque (WMS)

`/stock/*` continua em **snake_case**, no formato do modelo WMS (`produto_id`, `custo_unitario`...). Os tipos do front ficam em `src/types/stockWms.ts`. Convertê-lo agora teria custo alto e nenhum ganho. Reavaliar quando o modelo de estoque for revisto.

## Como mudar um campo

1. Altere o schema (`/schema-change`) e a migration.
2. Atualize o tipo em `client_smartsupply/src/types/` **no mesmo dia**.
3. Rode `npx tsc --noEmit` nos dois repositórios.
4. Atualize a tabela de situação abaixo.

## Situação por recurso

`ok` = só camelCase, igual ao modelo. `migrar` = ainda emite snake_case ou campos duplicados, ou o front lê snake_case.

| Recurso | Rotas | Situação |
| --- | --- | --- |
| Regionais | `/regionals` | ok |
| Auth | `/auth/*` | ok na API, front a conferir |
| Equipe | `/system/team-members` | API ok; **front migrar** (`full_name`, `role_label`, `role_title`, `photo_url`, `is_active`) |
| Módulos e categorias de módulos | `/system/modules`, `/system/module-categories` | migrar: a API emite o formato que o front lê (`is_enabled`, `route`, `badge`, `label`, `sort_order`), marcado como transitório |
| Presença | `/system/presence/*` | API ok; front migrar |
| Perfis de acesso, IA, governança | `/system/roles`, `/system/ai/*`, `/system/governance/*` | sem backend ainda |
| Dashboard | `/dashboard/*` | API ok; front migrar (`totalValue` → `totalSpent`, etc.) |
| Solicitações | `/solicitations` | migrar: a API emite os dois nomes (`solicitation_items`, `created_at`, `user_profile`, `unit_price`), transitório |
| Chamados | `/tickets/*` | migrar (campos duplicados) |
| Mural | `/feed/*` | migrar |
| Fornecedores | `/suppliers` | migrar |
| Usuários | `/users` | migrar |
| Pedidos | `/orders/*` | migrar (campos duplicados, divergências, `active-month`) |
| Contratos e orçamento | `/contracts/*` | migrar (campos duplicados) |
| Produtos | `/products/*` | migrar (listagem devolve `{items,total}` e `{products,totalCount}`; cadastro recebe `{product, categoryIds}`) |
| Notificações | `/notifications` | migrar (`read`, `link_url`, `metadata`) |
| Estoque | `/stock/*` | exceção (snake_case) |

## Teste de contrato

A comparação entre os tipos do front e as respostas reais da API será um teste do repositório, para falhar quando um lado mudar sem o outro. (A fazer.)
