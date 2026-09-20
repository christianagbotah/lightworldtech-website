import { z } from 'zod';

const normalizedEmail = z
  .string()
  .trim()
  .max(254)
  .email('Valid email is required')
  .transform((value) => value.toLowerCase());

const boundedPassword = z
  .string()
  .min(1, 'Password is required')
  .max(256, 'Password is too long');

export const adminLoginSchema = z.object({
  email: normalizedEmail,
  password: boundedPassword,
});

export const clientLoginSchema = z.object({
  email: normalizedEmail,
  password: boundedPassword,
});

export type LoginInput = z.infer<typeof adminLoginSchema>;
