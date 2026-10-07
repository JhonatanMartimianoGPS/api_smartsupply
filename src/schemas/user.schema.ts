import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.email('Invalid email'),
  password: z.string('Password is required').min(8, 'Password must have at least 8 characters'),
});

// Same fields, but all optional (for updates)
export const updateUserSchema = createUserSchema.partial();
