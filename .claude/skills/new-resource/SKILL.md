---
name: new-resource
description: Cria um recurso REST completo (schema Zod, service, controller, routes e registro da rota) seguindo o padrão de src/**/regional.*. Use quando o dev pedir uma nova rota/CRUD/endpoint para uma tabela.
argument-hint: <nome-do-recurso, ex. regional>
---

# Criar um novo recurso: $ARGUMENTS

Siga os passos na ordem. O modelo a copiar é sempre `src/**/regional.*` (o mais simples). Controllers e services são **classes com uma instância exportada**: é o padrão do projeto, não crie outro.

## 1. Encontre o model

Procure em `prisma/schema/` (`Grep` por `@@map("<tabela>")` ou `model Nome`).

- Se existir: anote o nome do model (ex.: `Regional` → `prisma.regional`), os campos obrigatórios e os índices.
- Se **não** existir: pare e use a skill `schema-change` primeiro.
- Não use `prisma/schema-prd-reference/`: é só consulta do banco antigo.

Confirme com o dev quais rotas ele quer (nem todo recurso precisa de CRUD completo), quais perfis podem escrever e quais campos podem ser expostos.

## 2. Crie os arquivos

Nomes no singular e em inglês: `src/schemas/<name>.schema.ts` (opcional), `src/services/<name>.service.ts`, `src/controllers/<name>.controller.ts`, `src/routes/<name>.routes.ts`.

**Schema** (Zod 3) — só os campos que o cliente envia (nunca `id`, `createdAt`, `updatedAt`):

```ts
import { z } from "zod";

export const createThingSchema = z.object({
  name: z.string({ required_error: "Nome é obrigatório." }).min(1, "Nome é obrigatório."),
});

// Mesmos campos, todos opcionais (para update)
export const updateThingSchema = createThingSchema.partial();
```

**Service** — classe com instância exportada, erros com `AppError(status, mensagem em português)`:

```ts
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error.middleware.js";

export class ThingService {
  async getById(id: string) {
    const thing = await prisma.thing.findUnique({ where: { id } });
    if (!thing) {
      throw new AppError(404, "Registro não encontrado.");
    }
    return thing;
  }
}

export const thingService = new ThingService();
```

Valores únicos duplicados e foreign key inválida **não** são traduzidos automaticamente: cheque antes e lance `AppError(400, ...)` (veja `regional.service.ts`). Não repita a mesma consulta duas vezes.

**Listagens** — sempre com limite (`take`). Para paginar, copie `listPaginated` de `product.service.ts`.

**Controller** — `try/catch` em cada método, repassando o erro com `next(error)` (Express 4):

```ts
export class ThingController {
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const thing = await thingService.getById(req.params.id as string);
      res.json(thing);
    } catch (error) {
      next(error);
    }
  }
}

export const thingController = new ThingController();
```

**Routes** — `authenticate` em todas e `authorize([...])` nas escritas:

```ts
const router = Router();
router.use(authenticate);

router.get("/:id", (req, res, next) => thingController.getById(req, res, next));
router.post("/", authorize(["super_admin", "admin"]), validate(createThingSchema), (req, res, next) =>
  thingController.create(req, res, next),
);

export const thingRoutes = router;
```

Imports relativos **sempre com `.js`** no final.

**Acesso**: se o recurso pertence a uma regional, contrato ou usuário, aplique o escopo no service (no Supabase isso vinha da RLS). Rotas de `PUT`/`PATCH`/`DELETE` não devem aceitar só o `id`.

## 3. Registre

- `src/routes/index.ts`: `import { thingRoutes } from "./thing.routes.js";` e `apiRouter.use("/things", thingRoutes);`

## 4. Valide (obrigatório)

1. `npx tsc --noEmit`
2. Delegue em paralelo aos agentes `db-reviewer` e `code-reviewer`; corrija os itens 🔴.
3. Se a API estiver rodando (`npm run dev`), teste com `curl` a listagem e o 404 de um id inexistente (use o token de `POST /api/v1/auth/login`).
4. Se o frontend vai usar o recurso, confira o formato esperado em `client_smartsupply/src/api/*.api.ts` antes de definir os nomes dos campos.
5. Mostre ao dev um resumo e os comandos `curl` para ele testar.
