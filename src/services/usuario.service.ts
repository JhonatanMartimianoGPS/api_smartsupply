import { prisma } from '../lib/prisma';
import { ErroHttp } from '../lib/erros';

export function listar() {
  return prisma.usuario.findMany({ orderBy: { id: 'asc' } });
}

export async function buscarPorId(id) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });

  if (!usuario) {
    throw new ErroHttp('Usuário não encontrado', 404);
  }

  return usuario;
}

export async function criar(dados) {
  const existente = await prisma.usuario.findUnique({
    where: { email: dados.email },
  });

  if (existente) {
    throw new ErroHttp('E-mail já cadastrado', 409);
  }

  return prisma.usuario.create({ data: dados });
}

export async function atualizar(id, dados) {
  await buscarPorId(id); // lança 404 se não existir
  return prisma.usuario.update({ where: { id }, data: dados });
}

export async function remover(id) {
  await buscarPorId(id);
  await prisma.usuario.delete({ where: { id } });
}
