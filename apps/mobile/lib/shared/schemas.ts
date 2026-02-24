import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Неверный формат email'),
  password: z.string().min(6, 'Минимум 6 символов'),
});

export const CreateUserSchema = z.object({
  full_name: z.string().min(2, 'Минимум 2 символа'),
  email: z.string().email('Неверный формат email'),
  phone: z.string().optional(),
  role: z.enum(['employee', 'admin']),
  store_id: z.string().uuid().optional().nullable(),
  password: z.string().min(6, 'Минимум 6 символов'),
});

export const UpdateUserSchema = CreateUserSchema.omit({ password: true, email: true }).partial();

export const CreateStoreSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  address: z.string().min(5, 'Укажите адрес'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const ProgressReportSchema = z.object({
  shift_id: z.string().uuid(),
  production_kg: z.number().positive('Укажите количество кг'),
});

export const TechRequestSchema = z.object({
  description: z.string().min(10, 'Опишите проблему подробнее'),
  shift_id: z.string().uuid().optional().nullable(),
});

export const ShiftEndSchema = z.object({
  production_kg: z.number().positive('Укажите количество кг'),
});

export const SalaryRateSchema = z.object({
  user_id: z.string().uuid(),
  period_start: z.string(),
  period_end: z.string(),
  rate_per_kg: z.number().positive('Укажите ставку'),
});

export const SupplySchema = z.object({
  store_id: z.string().uuid(),
  item_name: z.string().min(2),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  supplier: z.string().optional(),
  supplied_at: z.string(),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type CreateStoreInput = z.infer<typeof CreateStoreSchema>;
export type ProgressReportInput = z.infer<typeof ProgressReportSchema>;
export type TechRequestInput = z.infer<typeof TechRequestSchema>;
export type ShiftEndInput = z.infer<typeof ShiftEndSchema>;
export type SalaryRateInput = z.infer<typeof SalaryRateSchema>;
export type SupplyInput = z.infer<typeof SupplySchema>;
