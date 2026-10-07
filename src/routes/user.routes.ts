import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { validate } from '../middlewares/validate';
import { createUserSchema, updateUserSchema } from '../schemas/user.schema';

const router = Router();

router.get('/', userController.list);
router.get('/:id', userController.findById);
router.post('/', validate(createUserSchema), userController.create);
router.put('/:id', validate(updateUserSchema), userController.update);
router.delete('/:id', userController.remove);

export default router;
