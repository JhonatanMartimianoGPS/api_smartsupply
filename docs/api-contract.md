# Contrato da API (nomes de campos)

Este documento é o acordo entre `api_smartsupply` e `client_smartsupply`. Os dois repositórios são separados e **não há checagem de tipo entre eles**: se um lado muda um nome e o outro não, a tela quebra sem aviso. Por isso a regra abaixo é única e simples.

## Regra (decidida em 2026-10-08, opção B)

> **Na resposta, toda chave é o nome do campo do modelo Prisma (`prisma/schema/`) em snake_case.**
> **No corpo de entrada, o cliente envia snake_case.**

- `createdById` → `created_by_id`; relação `createdBy` → objeto `created_by`; `totalAmount` → `total_amount`.
- `Decimal` vira número, `Date` vira texto ISO. Colunas JSON livres (`details`, `metadata`, `items_payload`, `diff_before`, `diff_after`, `permissions`) são devolvidas como foram gravadas.
- **Campos calculados** (não existem no modelo) também ficam em snake_case, são montados no service e **precisam estar listados abaixo**, por recurso.
- **Nunca duas grafias da mesma chave** na mesma resposta.
- Query params (`?periodMonth=`) ficam como estão por enquanto; migram no fechamento da convenção.
- **Erro**: toda resposta de erro é `{ status_code, message, error }`; erro de validação (400) traz também `details` (as issues do Zod, sem conversão). O cliente mostra só `message`.

### Como funciona no código

- `src/lib/serialize.ts`: `serialize()` traduz a resposta; `toCamelCase()` traduz o corpo de entrada. Ambos mecânicos.
- `src/middlewares/convention.middleware.ts`: `apiConvention` faz as duas coisas num router (`router.use(apiConvention)` logo após `authenticate`). Vai sendo ligado recurso a recurso; no fim vale para a API inteira.
- Schemas Zod e services continuam com os **nomes do modelo em camelCase**: o middleware converte antes deles. A mensagem de erro de validação mostra o nome em snake_case, como o cliente enviou.
- O frontend lê e envia exatamente estes nomes em `src/types/` e `src/api/`. Como não há checagem de tipo entre os repositórios, o teste de contrato (abaixo) é a trava.

### Campos calculados por recurso

| Recurso | Campos calculados |
| --- | --- |
| Pedidos | pedido: `competence_month` (`AAAA-MM-01`), `items_count` (só em `active-month`); item: `total`, `product.categoria`, `product.fornecedor` (dos snapshots); histórico: `user_name`; divergência: `competence_month`, `reporter_name`, `contract`, `order` (resumo); relato: `competence_month`, `contract_id` |
| Chamados | `counts` (mensagens, etapas, anexos, produtos), `total_price` no produto do chamado |
| Dashboard | todos (agregações) |
| Validação de rascunho | todos (`exists_in_catalog`, `available_for_contract`, …) |

## Exceção: estoque (WMS)

`/stock/*` continua no formato do modelo WMS (já é snake_case). Reavaliar quando o modelo de estoque for revisto.

## Como mudar um campo

1. Altere o schema (`/schema-change`) e a migration.
2. Atualize o tipo em `client_smartsupply/src/types/` **no mesmo dia**, com o nome em snake_case.
3. Rode `npx tsc --noEmit` nos dois repositórios e `npm test` na API (testes de contrato).
4. Se for campo calculado, liste na tabela acima.

## Situação por recurso

`ok` = router com `apiConvention`, sem chave duplicada, front lendo os nomes do modelo em snake_case. `migrar` = ainda no formato antigo (camelCase do Prisma, duas grafias ou nomes do Supabase). Ordem de migração: dashboard, sistema/usuários, contratos, produtos, solicitações, chamados, pedidos, notificações, auth, feed/equipe.

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
| Mural | `/feed/*` | API ok (`{ items, total, page, page_size, total_pages }`, autor em `user`, `likes_count`, `comments_count`, `has_liked`); **front migrar** (`user_profile`, `is_pinned`, `comment_count`, `totalCount`) |
| Fornecedores | `/suppliers` | migrar |
| Usuários | `/users` | migrar |
| Pedidos | `/orders/*` | ok |
| Contratos e orçamento | `/contracts/*` | migrar (campos duplicados) |
| Produtos | `/products/*` | migrar (listagem devolve `{items,total}` e `{products,totalCount}`; cadastro recebe `{product, categoryIds}`) |
| Notificações | `/notifications` | ok |
| Estoque | `/stock/*` | exceção (snake_case) |

## Teste de contrato

`src/__tests__/contract.<recurso>.test.ts` (roda com `npm test`, com a API local no ar): para cada rota, confere que toda chave da resposta está em snake_case (`assertSnakeKeys`) e que as chaves que o frontend lê existem (`assertHasKeys`). Apoio em `src/__tests__/helpers/api.ts`. Se alguém mudar um lado e esquecer o outro, o teste falha.
