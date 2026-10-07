import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string('Name is required').min(2, 'Name is too short'),
  email: z.email('Invalid email'),
});

// Same fields, but all optional (for updates)
export const updateUserSchema = createUserSchema.partial();
