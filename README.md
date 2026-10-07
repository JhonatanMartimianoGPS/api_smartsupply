# api_smartsupply

API REST em Node com Express, Zod, Prisma (PostgreSQL) e TypeScript. O `tsx` executa os arquivos `.ts` direto, sem build em desenvolvimento.

## Pré-requisitos

| Item | Versão | Observação |
| --- | --- | --- |
| Node.js | **22.12+** (recomendado: LTS atual) | O Prisma 7 não instala em versões anteriores, como a 22.11. Confira com `node -v` |
| npm | Vem com o Node | |
| Docker | Qualquer versão recente | Para subir o PostgreSQL. Pode usar um PostgreSQL 15+ já instalado |
| Cliente HTTP | `curl`, Insomnia ou Postman | Para testar a API |

## Primeira execução

Rode os comandos na raiz do projeto, nesta ordem.

### 1. Instalar as dependências

```bash
npm install
```

### 2. Criar o arquivo `.env`

Copie o exemplo e ajuste se precisar:

```bash
cp .env.example .env
```

No Windows (PowerShell): `Copy-Item .env.example .env`

Para o PostgreSQL do `docker-compose.yml`, o conteúdo deve ser:

```text
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/minha_api"
PORT=3000
```

O formato da URL é `postgresql://USUARIO:SENHA@HOST:PORTA/NOME_DO_BANCO`.

### 3. Subir o banco de dados

```bash
docker compose up -d
docker compose ps
```

O container `minha-api-db` deve aparecer com status `Up`. No Windows, abra o Docker Desktop antes.

Se preferir um PostgreSQL já instalado, crie um banco chamado `minha_api` e ajuste o `DATABASE_URL` do `.env`.

### 4. Aplicar as migrations e gerar o client do Prisma

```bash
npm run db:migrate
npm run db:generate
```

O `db:migrate` cria as tabelas no banco. O `db:generate` cria a pasta `src/generated/prisma`, que não vai para o git. Sem ela, a API não sobe.

### 5. Rodar a API

```bash
npm run dev
```

O terminal deve mostrar `API rodando em http://localhost:3000`. O modo `dev` reinicia sozinho a cada alteração no código.

### 6. Conferir que está funcionando

```bash
curl http://localhost:3000/health
```

Resposta esperada: `{"status":"ok"}`.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe a API e reinicia a cada alteração no código |
| `npm start` | Sobe a API sem recarga automática (produção) |
| `npm run db:generate` | Gera o client do Prisma a partir do `schema.prisma` |
| `npm run db:migrate` | Cria e aplica uma migration no banco de desenvolvimento |
| `npm run db:deploy` | Aplica as migrations existentes (produção) |
| `npm run db:studio` | Abre uma interface web para ver e editar os dados |
| `npx tsc --noEmit` | Confere o TypeScript. Sem saída significa que está tudo certo |

## Rotas

| Método | URL | Descrição | Status de sucesso |
| --- | --- | --- | --- |
| GET | `/health` | Confere se a API está de pé | 200 |
| GET | `/usuarios` | Lista os usuários | 200 |
| GET | `/usuarios/:id` | Busca um usuário | 200 |
| POST | `/usuarios` | Cria um usuário (`nome`, `email`) | 201 |
| PUT | `/usuarios/:id` | Atualiza um usuário (campos opcionais) | 200 |
| DELETE | `/usuarios/:id` | Remove um usuário | 204 |

Exemplo:

```bash
curl -i -X POST http://localhost:3000/usuarios \
  -H "Content-Type: application/json" \
  -d '{"nome":"Maria","email":"maria@exemplo.com"}'
```

No PowerShell do Windows, use `curl.exe` no lugar de `curl`, ou teste pelo Insomnia ou Postman, por causa das regras de aspas.

Erros devolvem sempre `{"erro": "mensagem"}`: `400` para dados inválidos ou `:id` inválido, `404` para registro não encontrado e `409` para e-mail repetido.

## Estrutura de pastas

```text
├── prisma/
│   ├── schema.prisma             ← modelos do banco
│   └── migrations/               ← gerada pelo Prisma (versionar no git)
├── src/
│   ├── generated/prisma/         ← gerada pelo Prisma (não editar, não versionar)
│   ├── lib/                      ← prisma.ts, erros.ts, ler-id.ts
│   ├── middlewares/              ← validar.ts, tratar-erros.ts
│   ├── schemas/                  ← validação do body com Zod
│   ├── services/                 ← regras de negócio e acesso ao banco
│   ├── controllers/              ← lê req, chama o service, devolve res
│   ├── routes/                   ← liga a URL ao controller
│   ├── app.ts                    ← configura o Express
│   └── server.ts                 ← sobe o servidor (listen)
├── .env
├── docker-compose.yml            ← PostgreSQL local
├── prisma.config.ts              ← configuração do Prisma CLI
└── tsconfig.json
```

O fluxo de uma requisição é sempre: rota → controller → service → banco. Erros lançados no caminho são capturados pelo `tratar-erros.ts`.

| Camada | Responsabilidade | Não deve fazer |
| --- | --- | --- |
| `routes/` | Liga a URL ao controller e aplica a validação | Ter lógica |
| `controllers/` | Lê `req`, chama o service, devolve `res` | Acessar o banco |
| `services/` | Regras de negócio e acesso ao banco via Prisma | Conhecer `req` e `res` |
| `schemas/` | Descreve e valida os dados de entrada com Zod | Ter regra de negócio |

## Criar uma nova funcionalidade

Um recurso novo segue os mesmos passos. O exemplo cria `produto`:

1. Acrescente o `model Produto` ao `prisma/schema.prisma`.
2. Rode `npm run db:migrate -- --name criar-produto` e depois `npm run db:generate`.
3. Crie `src/schemas/produto.schema.ts`.
4. Copie `usuario.service.ts`, `usuario.controller.ts` e `usuario.routes.ts`, trocando os nomes. No service, apague a checagem de e-mail repetido.
5. Registre a rota em `src/routes/index.ts`: `router.use('/produtos', produtoRoutes);`
6. Teste com `curl`.

## Prisma no dia a dia

| Situação | Comandos |
| --- | --- |
| Mudei o `schema.prisma` (coluna ou model novo) | `npm run db:migrate -- --name descricao-curta` e depois `npm run db:generate` |
| Clonei o projeto ou outro dev mudou o schema | `npm install`, `npm run db:migrate` e `npm run db:generate` |
| Publicar em produção | `npm run db:deploy` (só aplica as migrations existentes) |
| Ver ou editar dados | `npm run db:studio` |

Regras para evitar problemas com migrations:

- O nome da migration vai depois de `--`: `npm run db:migrate -- --name criar-produto`.
- Commite sempre a pasta `prisma/migrations`.
- Nunca edite nem apague uma migration já aplicada: crie outra.
- Para apagar uma tabela, remova o `model` do schema e rode o `db:migrate`, que gera o `DROP TABLE`.
- `npx prisma migrate reset` apaga todos os dados do banco. Use só em desenvolvimento.

## Problemas comuns

| Sintoma | Causa provável | Solução |
| --- | --- | --- |
| `npm install` falha com "Prisma only supports Node.js versions 20.19+, 22.12+, 24.0+" | Node antigo | Instalar o Node 22.12+ (ou o LTS atual) |
| Módulo não encontrado ao importar `generated/prisma/client` | O client ainda não foi gerado | `npm run db:generate` |
| `prisma.produto` indefinido ou campo novo não aparece | Client desatualizado em relação ao schema | `npm run db:generate` e reiniciar a API |
| `DATABASE_URL` não foi encontrada | Falta o `.env` na raiz | Criar o `.env` como no passo 2 |
| `ECONNREFUSED` | O PostgreSQL não está rodando | Abrir o Docker, `docker compose up -d` e conferir com `docker compose ps` |
| Falha de autenticação no banco | Usuário ou senha do `DATABASE_URL` diferem do `docker-compose.yml` | Alinhar os dois. Se o volume já existia, as credenciais antigas continuam valendo |
| Porta 5432 já em uso | Há outro PostgreSQL na máquina | Trocar o mapeamento para `"5433:5432"` no compose e a porta na URL |
| Erros entre CLI e client, ou aparece Prisma 8 | `prisma` e `@prisma/client` em versões diferentes | `npm i @prisma/client@7 && npm i -D prisma@7` |
| `migrate dev` diz que as migrations aplicadas não estão na pasta local | A pasta `prisma/migrations` foi apagada, mas o banco guarda o histórico | Em desenvolvimento: `npx prisma migrate reset --force` e depois `npm run db:migrate` |
| Resposta 500 sem explicação | Erro inesperado no código ou no banco | Ver o log no terminal da API |
| Aviso do npm sobre `allowScripts` ao instalar | O npm novo pede aprovação dos scripts de instalação | `npm install-scripts approve prisma esbuild` |

## Parar o ambiente

```bash
docker compose stop        # para o banco e mantém os dados
docker compose down        # remove o container e mantém os dados
docker compose down -v     # remove também o volume: apaga todos os dados
```
