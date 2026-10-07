import { Router } from 'express';
import usuarioRoutes from './usuario.routes';

const router = Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));

router.use('/usuarios', usuarioRoutes);
// router.use('/produtos', produtoRoutes);

export default router;
