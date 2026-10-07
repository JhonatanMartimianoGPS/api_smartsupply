import { Router } from 'express';
import userRoutes from './user.routes';

const router = Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));

router.use('/users', userRoutes);
// router.use('/products', productRoutes);

export default router;
