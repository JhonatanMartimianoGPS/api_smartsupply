import * as usuarioService from '../services/usuario.service';
import { lerId } from '../lib/ler-id';

export async function listar(req, res) {
  const usuarios = await usuarioService.listar();
  res.json(usuarios);
}

export async function buscarPorId(req, res) {
  const usuario = await usuarioService.buscarPorId(lerId(req));
  res.json(usuario);
}

export async function criar(req, res) {
  const usuario = await usuarioService.criar(req.body);
  res.status(201).json(usuario);
}

export async function atualizar(req, res) {
  const usuario = await usuarioService.atualizar(lerId(req), req.body);
  res.json(usuario);
}

export async function remover(req, res) {
  await usuarioService.remover(lerId(req));
  res.status(204).send();
}
