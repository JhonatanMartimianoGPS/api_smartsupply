---
name: prisma-queries
description: Padrões de consultas Prisma rápidas e simples para este projeto (select, paginação, relações sem N+1, Promise.all, transações, lote). Use ao escrever ou alterar qualquer chamada prisma.* em src/services.
---

# Consultas Prisma: padrões do projeto

Objetivo: consultas rápidas **e** fáceis de ler. Copie estes padrões.

## Sempre `select` com os campos necessários

```ts
const publicFields = { id: true, name: true, createdAt: true };

prisma.product.findMany({ select: publicFields });
```

Menos colunas = menos dados trafegando e nenhum campo sensível exposto.

## Listagem sempre com limite

```ts
// page e pageSize vêm da query (veja listPaginated em product.service.ts)
prisma.order.findMany({ select: publicFields, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize });
```

O `orderBy` deve bater com um índice existente (veja os `@@index` do model).

## Relações: busque junto, não em loop (evita N+1)

```ts
// ❌ uma consulta por pedido
for (const order of orders) {
  order.items = await prisma.orderItem.findMany({ where: { orderId: order.id } });
}

// ✅ uma consulta só
prisma.order.findMany({
  select: { id: true, totalAmount: true, items: { select: { id: true, quantity: true } } },
  take: pageSize,
});
```

Quando a relação não existe no schema, busque os ids de uma vez: `where: { id: { in: ids } }`.

## Consultas independentes em paralelo

```ts
const [orders, total] = await Promise.all([
  prisma.order.findMany({ where, select: publicFields, take: pageSize }),
  prisma.order.count({ where }),
]);
```

## Escritas que dependem uma da outra: transação

```ts
await prisma.$transaction([
  prisma.order.update({ where: { id }, data: { status: 'aprovado' } }),
  prisma.orderHistory.create({ data: { orderId: id, userId, action: 'approved' } }),
]);
```

## Muitos registros: lote em vez de loop

```ts
await prisma.orderItem.createMany({ data: items });
```

## Deixe o banco trabalhar

- Filtre no `where`, não com `.filter()` depois de buscar tudo.
- O `errorHandler` atual não traduz erros do Prisma (`P2002`, `P2003`): valor duplicado e foreign key inválida precisam de checagem explícita com `AppError` (veja `regional.service.ts`).
- `findUnique` para buscar por `id` ou coluna `@unique`; `findFirst` só quando o filtro não é único.

## Ver o SQL gerado (debug)

Em desenvolvimento o `src/lib/prisma.ts` já loga todas as queries no console (`log: ["query", ...]`).

Para ver o plano de uma consulta no banco local:

```bash
psql postgresql://postgres:postgres@localhost:5432/smartsupply -c "EXPLAIN SELECT ..."
```
