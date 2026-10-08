---
description: Valida tudo que mudou (tsc, prisma validate e agentes revisores de banco e de código)
argument-hint: "[arquivo ou pasta opcional para focar]"
---

Valide as mudanças atuais do projeto. Foco opcional: $ARGUMENTS

1. Liste o que mudou com `git status --porcelain` e `git diff --stat`. Se nada mudou, avise e pare.
2. Rode `npx tsc --noEmit`.
3. Se algum arquivo em `prisma/` mudou, rode `npx prisma validate`.
4. Classifique as mudanças:
   - **banco**: arquivos em `prisma/`, ou services com chamadas `prisma.`;
   - **código**: o restante de `src/`.
5. Delegue em paralelo: `db-reviewer` se houver mudança de banco e `code-reviewer` se houver mudança de código.
6. Junte os resultados em um relatório único em pt-BR:

```
## Resultado da validação

tsc: ✅/❌ | prisma validate: ✅/❌/não se aplica

🔴 Corrigir antes de entregar
🟡 Recomendado
🟢 Ok
```

7. Pergunte ao dev se ele quer que você corrija os itens 🔴 (e quais 🟡). Não corrija sem confirmação.
