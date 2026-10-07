import * as userService from '../services/user.service';
import { readId } from '../lib/read-id';

export async function list(req, res) {
  const users = await userService.list();
  res.json(users);
}

export async function findById(req, res) {
  const user = await userService.findById(readId(req));
  res.json(user);
}

export async function create(req, res) {
  const user = await userService.create(req.body);
  res.status(201).json(user);
}

export async function update(req, res) {
  const user = await userService.update(readId(req), req.body);
  res.json(user);
}

export async function remove(req, res) {
  await userService.remove(readId(req));
  res.status(204).send();
}
