import { Router } from 'express';
import * as usuarioController from '../controllers/usuario.controller';
import { validar } from '../middlewares/validar';
import { criarUsuarioSchema, atualizarUsuarioSchema } from '../schemas/usuario.schema';

const router = Router();

router.get('/', usuarioController.listar);
router.get('/:id', usuarioController.buscarPorId);
router.post('/', validar(criarUsuarioSchema), usuarioController.criar);
router.put('/:id', validar(atualizarUsuarioSchema), usuarioController.atualizar);
router.delete('/:id', usuarioController.remover);

export default router;
