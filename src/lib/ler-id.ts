import { ErroHttp } from './erros';

// Lê o :id da URL e garante que é um número inteiro positivo
export function lerId(req) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    throw new ErroHttp('ID inválido', 400);
  }

  return id;
}
