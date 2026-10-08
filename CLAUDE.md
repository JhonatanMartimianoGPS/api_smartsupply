# api_smartsupply — instruções para o Claude

API REST do **GPS Bridge / SmartSupply** (Grupo GPS): contratos e orçamentos, pedidos mensais e extras, solicitações, chamados, mural, notificações e estoque/WMS.
O frontend é outro repositório (`client_smartsupply`, React + Vite) e consome esta API em `/api/v1`. Os dois repositórios **nunca viram monorepo**.

## Contexto do projeto

- O sistema migrou do Supabase para este backend. No Supabase, as regras viviam em RLS, triggers e funções SQL. **Agora toda regra de negócio e de acesso fica no backend** (services e middlewares), nunca no banco.
- Objetivo atual: **ter o sistema funcionando como antes (paridade com o Supabase)**.
- `prisma/schema/` é o **modelo correto**. As pastas `prisma/schema-prd-reference/` e `prisma/migrations-prd-reference/` são só uma tradução 1:1 do banco antigo do Supabase para consulta de regras antigas: **nunca copie** convenções ou models delas e **não mexa** nelas.
- Quando front e back divergem, o padrão é o **front se adaptar** ao modelo novo. Adaptadores no backend são transitórios e devem dizer isso em comentário (exemplo: `toProductInput` em `product.controller.ts`).

## Quem usa este projeto

A equipe tem **2 desenvolvedores júnior**. Toda decisão segue esta premissa:

> O código precisa continuar simples e fácil de ler. Na dúvida entre "esperto" e "óbvio", escolha o óbvio.

- Responda sempre em **português (pt-BR)**, explicando o *porquê* das mudanças em linguagem simples.
- Código, nomes de arquivos e variáveis ficam em **inglês**. Mensagens de erro para o usuário ficam em **português**, como no restante da API.
- Comentários curtos, só quando explicam o *porquê*.
- Não crie abstrações novas (repositories, injeção de dependência, generics, factories) sem o dev pedir.
- Não adicione dependências novas sem perguntar antes.
- Prefira copiar o padrão de um arquivo existente (`regional.*` é o mais simples) a inventar um novo.

## Stack (versões reais)

| Item | Versão / detalhe |
| --- | --- |
| Node.js | 22 (ESM, `"type": "module"`, `module: NodeNext`) |
| Express | 4.21 — erros de função `async` **não** chegam sozinhos: o controller precisa de `try/catch` com `next(error)` |
| Zod | 3.24 — `z.string({ required_error: '...' })` |
| Prisma | 6.4, client padrão `@prisma/client` (sem adapter, sem `src/generated`) |
| PostgreSQL | 17, schema `public`, banco `smartsupply` em `localhost:5432` |
| TypeScript | 5.8, `strict: true`, executado pelo `tsx` em dev e `tsc` no build |
| Auth | JWT (access + refresh), bcryptjs, perfis `AppRole` |
| Outros | helmet, cors, express-rate-limit, multer (uploads), swagger-ui-express |

## Arquitetura

Fluxo fixo: `routes → controllers → services → Prisma`. Erros sobem para `src/middlewares/error.middleware.ts`.

| Camada | Faz | Não faz |
| --- | --- | --- |
| `routes/` | Mapeia URL → controller, aplica `authenticate`, `authorize([...])` e `validate(schema)` | Lógica |
| `controllers/` | Lê `req`, chama o service, responde, `try/catch` com `next(error)` | Acessar o banco |
| `services/` | Regras de negócio e Prisma | Conhecer `req`/`res` |
| `schemas/` | Validação Zod do body | Regras de negócio |
| `middlewares/` | `auth`, `validate`, `error`, `logger`, `metrics` | — |
| `lib/`, `utils/` | `prisma` (singleton), `jwt`, `password` | — |

Padrão do código (copie de `regional.*`):

- Controller: `export class XController { async método(req, res, next) { try { … } catch (error) { next(error); } } }` e `export const xController = new XController();`. O service segue o mesmo molde: `export const xService = new XService();`.
- Rota: `const router = Router(); router.use(authenticate);` e cada handler como `(req, res, next) => xController.método(req, res, next)`. Exporta `xRoutes`.
- Erro esperado: `throw new AppError(status, 'Mensagem em português.')`. A resposta é `{ statusCode, message, error }`.
- Imports relativos **com extensão `.js`** (`'../lib/prisma.js'`), exigência do `NodeNext`.
- Toda rota nova é registrada em `src/routes/index.ts`.
- Rotas de escrita devem ter `authorize([...])`. Toda rota de `DELETE`/`PUT`/`PATCH` sobre dado de um dono precisa **checar perfil e escopo** (veja Acesso abaixo).
- Nunca retorne campos sensíveis (`passwordHash`): use `select`.

## Formato da API (convenção atual)

- O body costuma entrar em **camelCase** e as respostas saem em **snake_case** (`valor_unitario`, `regional_id`), por compatibilidade com o frontend herdado do Supabase.
- O frontend ainda envia alguns formatos antigos (por exemplo, produto como `{ product: {...}, categoryIds }`). Quando for assim, traduza no controller e marque como **transitório**.
- A convenção definitiva de nomes ainda será alinhada com o time. Não renomeie campos de resposta por conta própria: o frontend quebra sem aviso, porque não há erro de tipo entre os dois repositórios.

## Regras de negócio e acesso (no lugar de RLS e triggers)

- **Orçamento**: o consumo é debitado quando o pedido é aprovado ou entregue e estornado quando sai desse estado (`order.service.ts`). O desconto por categoria de produto (`ContractProductCategoryBudgetPeriod`) ainda **não** está implementado.
- **Acesso por regional/contrato**: no Supabase vinha da RLS. Use `accessService` (`src/services/access.service.ts`): `contractFilter(user)` nas listagens e `assertContractAccess(user, contractId)` para um contrato. Ele lê os vínculos do banco, e não do token. Pedidos já usam; ao tocar em solicitações, chamados, contratos e dashboard, aplique o mesmo escopo. O estoque ainda tem filtro próprio. Não exponha dado de outra regional.
- **Notificações e histórico**: eram triggers. Hoje precisam ser criados explicitamente no service que muda o estado.
- Antes de portar uma regra do Supabase, consulte a migration original em `client_smartsupply` (branch `main`, pasta `supabase/migrations`) para entender o comportamento exato.

## Convenções do Prisma

- Arquivos em `prisma/schema/`, **um por domínio** (`base`, `users`, `contracts`, `products`, `orders`, `solicitations`, `tickets`, `stock`, `feed`, `system`, `audit`). Model novo vai no arquivo do domínio dele. `package.json` aponta para a pasta com `"prisma": { "schema": "prisma/schema" }`.
- Model em PascalCase **singular** (`Product`); tabela em snake_case plural via `@@map("products")`. Acesso no código em camelCase: `prisma.product`.
- Campos em camelCase com `@map("snake_case")`. `id String @id @default(uuid())`, `createdAt DateTime @default(now()) @map("created_at")`, `updatedAt DateTime @updatedAt @map("updated_at")` — o Prisma preenche o `updatedAt` sozinho.
- Enums globais (`AppRole`, `OrderStatus`, `TicketStatus`, `TicketPriority`) ficam em `base.prisma`.
- Índices com `@@index`. O PostgreSQL **não** cria índice automático para foreign key.
- Antes de criar model, procure em `prisma/schema/`.

## Banco, migrations e comandos perigosos

- Subir o banco: o container se chama `smartsupply-db` (`docker-compose.yml`). O banco responde em `localhost:5432`.
- **Histórico de migrations**: `prisma/schema/migrations/` (dentro da pasta do schema: com o schema dividido em vários arquivos, o Prisma procura as migrations ali, e não em `prisma/migrations/`) tem uma baseline (`20261008120000_baseline`, o schema completo na data) e migrations incrementais por cima, mais o `migration_lock.toml`. Toda mudança de schema vira uma migration nova, versionada junto com o código. **Não use `db push`**: ele muda o banco sem gerar migration e faz o histórico divergir do schema.
- Mudou o schema? Edite `prisma/schema/`, rode `npm run prisma:migrate -- --name <descricao-curta-em-ingles>`, leia o `migration.sql` gerado e commite a pasta nova junto com o schema.
- Scripts reais: `npm run dev`, `build`, `start`, `seed`, `test`, `prisma:generate`, `prisma:migrate`, `prisma:studio`.
- **Nunca execute sem o dev pedir explicitamente**: `npx prisma migrate reset`, `npx prisma migrate deploy`, `npx prisma migrate resolve`, `npx prisma db push`, `docker compose down -v`, apagar ou editar migration já aplicada. Seed e migrations alteram o banco local: só com pedido.
- Antes de `npm run prisma:migrate`, mostre o que vai mudar e peça confirmação.

## Ambiente

- Use Node 22. Nunca use `sudo` interativo (use `sudo -n`).
- API em `http://localhost:3000`, Swagger em `/api-docs`, front em `http://localhost:5174`.
- Usuários do seed (senha `admin123`): `admin@`, `admin.sp@`, `gestor@`, `suprimentos@`, `assistente@`, `colaborador@` — todos `@gpssa.com.br`. A senha vale só para o ambiente local.
- Nunca exiba segredos do `.env`.

## Git

- **Nunca faça `git push`** sem o dev pedir expressamente.
- Commits em **português**, no formato `tipo(escopo): descrição` (como o histórico: `feat(prisma): …`, `fix(cors): …`).
- Não crie commit sem o dev pedir.

## Validação obrigatória ao terminar

Nenhuma tarefa está concluída sem esta etapa. Um hook roda o `tsc` automaticamente no fim, mas a revisão é sua responsabilidade.

1. **Sempre**: `npx tsc --noEmit` sem erros (e `npm run build` quando a mudança é grande).
2. **Se a mudança envolve banco** (arquivos em `prisma/`, ou qualquer chamada `prisma.` nos services):
   - `npx prisma validate` se o schema mudou;
   - delegue a revisão ao agente **`db-reviewer`**, com foco em performance das consultas;
   - corrija os itens 🔴 antes de entregar.
3. **Demais mudanças**: delegue ao agente **`code-reviewer`** e corrija os itens 🔴.
4. Se as duas coisas mudaram, rode os dois agentes em paralelo.
5. Se a mudança altera o que a API devolve, confirme o impacto no `client_smartsupply` (procure o endpoint em `src/api/*.api.ts`).
6. Termine com um resumo curto: o que mudou, o que foi validado e o que ficou como sugestão.

## Atalhos disponíveis

| Comando | Para quê |
| --- | --- |
| `/new-resource <nome>` | Cria um CRUD completo (schema Zod, service, controller, routes) |
| `/schema-change <descrição>` | Altera o banco (model, coluna, índice) com cuidado com as migrations |
| `/check` | Valida tudo que mudou (tsc + prisma + agentes revisores) |
| `/explain <arquivo ou fluxo>` | Explica um trecho do código de forma didática |

## Pontos conhecidos (não invente solução sem o dev pedir)

- README e Swagger estão desatualizados em relação às rotas reais; a fonte da verdade é `src/routes/`.
- Segredos JWT de exemplo em `.env.example` e a senha de seed servem apenas para desenvolvimento.
- Uploads aceitam SVG e são servidos sem autenticação em `/uploads`; o storage `azure` está declarado e não implementado.
