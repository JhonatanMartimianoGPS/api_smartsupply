---
description: Explica um arquivo, rota ou fluxo do projeto de forma didática para devs júnior
argument-hint: <arquivo, rota (ex. "POST /users") ou assunto>
---

Explique para um dev júnior: $ARGUMENTS

- Leia os arquivos envolvidos antes de explicar. Se for uma rota, siga o caminho completo: `routes → controller → service → model no prisma/schema` (e, se afetar a tela, o endpoint correspondente em `client_smartsupply/src/api`).
- Escreva em pt-BR simples, em passos numerados, citando `arquivo:linha`.
- Explique o *porquê* de cada parte (ex.: por que o `select` esconde o `password_hash`, por que o controller repassa o erro com `next(error)`).
- Termine com uma seção curta: "O que pode dar errado aqui" (erros comuns e o status HTTP retornado).
- Não altere nenhum arquivo.
