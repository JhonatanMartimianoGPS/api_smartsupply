import { prisma } from '../lib/prisma';
import { HttpError } from '../lib/errors';
import { hashPassword } from '../lib/password';

// Never expose password_hash
const publicFields = { id: true, email: true, created_at: true, updated_at: true };

export function list() {
  return prisma.users.findMany({ select: publicFields, orderBy: { created_at: 'asc' } });
}

export async function findById(id) {
  const user = await prisma.users.findUnique({ where: { id }, select: publicFields });

  if (!user) {
    throw new HttpError('User not found', 404);
  }

  return user;
}

export async function create(data) {
  const existing = await prisma.users.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new HttpError('Email already registered', 409);
  }

  return prisma.users.create({
    data: { email: data.email, password_hash: await hashPassword(data.password) },
    select: publicFields,
  });
}

export async function update(id, data) {
  await findById(id); // throws 404 if it does not exist

  const changes: { email?: string; password_hash?: string } = {};
  if (data.email) changes.email = data.email;
  if (data.password) changes.password_hash = await hashPassword(data.password);

  return prisma.users.update({
    where: { id },
    data: { ...changes, updated_at: new Date() },
    select: publicFields,
  });
}

export async function remove(id) {
  await findById(id);
  await prisma.users.delete({ where: { id } });
}
