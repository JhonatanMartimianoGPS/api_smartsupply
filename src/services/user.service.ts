import { prisma } from '../lib/prisma';
import { HttpError } from '../lib/errors';

export function list() {
  return prisma.user.findMany({ orderBy: { id: 'asc' } });
}

export async function findById(id) {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new HttpError('User not found', 404);
  }

  return user;
}

export async function create(data) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new HttpError('Email already registered', 409);
  }

  return prisma.user.create({ data });
}

export async function update(id, data) {
  await findById(id); // throws 404 if it does not exist
  return prisma.user.update({ where: { id }, data });
}

export async function remove(id) {
  await findById(id);
  await prisma.user.delete({ where: { id } });
}
