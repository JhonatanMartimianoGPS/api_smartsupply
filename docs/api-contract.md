# Contrato da API (nomes de campos)

Este documento é o acordo entre `api_smartsupply` e `client_smartsupply`. Os dois repositórios são separados e **não há checagem de tipo entre eles**: se um lado muda um nome e o outro não, a tela quebra sem aviso. Por isso a regra abaixo é única e simples.

## Regra (decidida em 2026-10-08, opção B)

> **Na resposta, toda chave é o nome do campo do modelo Prisma (`prisma/schema/`) em snake_case.**
> **No corpo de entrada, o cliente envia snake_case.**

- `createdById` → `created_by_id`; relação `createdBy` → objeto `created_by`; `totalAmount` → `total_amount`.
- `Decimal` vira número, `Date` vira texto ISO. Colunas JSON livres (`details`, `metadata`, `items_payload`, `diff_before`, `diff_after`, `permissions`) são devolvidas como foram gravadas.
- **Campos calculados** (não existem no modelo) também ficam em snake_case, são montados no service e **precisam estar listados abaixo**, por recurso.
- **Nunca duas grafias da mesma chave** na mesma resposta.
- **Query params** também em snake_case (`?contract_id=`, `?period_month=`). O middleware converte para camelCase antes do controller e **ainda aceita camelCase** (`?contractId=`) enquanto o front migra.
- **Erro**: toda resposta de erro é `{ status_code, message, error }`; erro de validação (400) traz também `details` (as issues do Zod, sem conversão). O cliente mostra só `message`.

### Como funciona no código

- `src/lib/serialize.ts`: `serialize()` traduz a resposta; `toCamelCase()` traduz o corpo de entrada. Ambos mecânicos.
- `src/middlewares/convention.middleware.ts`: `apiConvention` faz as três coisas (corpo, query e resposta) num router (`router.use(apiConvention)` logo após `authenticate`). Está ligado em **todos os routers, menos `/stock/*`**; todo router novo liga também.
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
| Auth | `/auth/*` | ok (`access_token`, `refresh_token`, `user` no formato de `/users`) |
| Usuários | `/users` | ok |
| Equipe | `/system/team-members` | API ok; **front migrar** (`full_name`, `role_label`, `role_title`, `photo_url`, `is_active`), baixa prioridade |
| Módulos e categorias de módulos | `/system/modules`, `/system/module-categories` | ok |
| Presença | `/system/presence/*` | API ok; **front migrar**, baixa prioridade |
| Perfis de acesso, IA, governança | `/system/roles`, `/system/ai/*`, `/system/governance/*` | sem backend ainda |
| Dashboard | `/dashboard/*` | ok |
| Contratos e orçamento | `/contracts/*` | ok |
| Produtos, categorias e fornecedores | `/products/*`, `/categories`, `/suppliers` | ok |
| Pedidos | `/orders/*` | ok |
| Solicitações | `/solicitations` | ok |
| Chamados | `/tickets/*` | ok (tipos e fluxos só leitura; o CRUD deles ainda não tem backend) |
| Notificações | `/notifications` | ok |
| Mural | `/feed/*` | API ok; **front migrar** (`user_profile`, `is_pinned`, `comment_count`, `totalCount`), baixa prioridade |
| Estoque | `/stock/*` | exceção: formato do WMS (já snake_case), sem `apiConvention` |

## Pendências conhecidas (fora da convenção de nomes)

Não são problema de grafia, e sim de funcionalidade; ficam registradas aqui para não serem confundidas com o contrato:

- **Relatos de problemas** (`/orders/issue-reports`): o front envia contrato, categoria e severidade (modelo antigo do Supabase); a API guarda só `order_id` e `description`, com status `aberto/em_analise/resolvido` (o front compara com `open/in_review/resolved`). Precisa de decisão de modelo.
- `/auth/register` e `/auth/reset-password` ("esqueci minha senha"): o front chama, a API não tem.
- `/orders/items/batch`: o front chama, a API não tem (`/orders/items/query` cobre o caso).
- Assistente de IA (`/system/assistant`): sem backend; o front já lê o último pedido histórico com os nomes do contrato.
- Query params do front ainda em camelCase (`?contractId=`): funcionam pela tolerância do middleware; migrar com calma.

## Teste de contrato

`src/__tests__/contract.<recurso>.test.ts` (roda com `npm test`, com a API local no ar): para cada rota, confere que toda chave da resposta está em snake_case (`assertSnakeKeys`) e que as chaves que o frontend lê existem (`assertHasKeys`). Apoio em `src/__tests__/helpers/api.ts`. Se alguém mudar um lado e esquecer o outro, o teste falha.


Cada arquivo faz um login; o limitador de login permite 15 por IP a cada 15 min. Para rodar `npm test` mais de uma vez seguida, defina `AUTH_RATE_LIMIT_MAX=200` no `.env` local (ou reinicie a API, que zera o contador).