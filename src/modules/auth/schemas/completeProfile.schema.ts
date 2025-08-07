import { z } from "zod";

export const completeProfileSchema = z.object({
  dniName: z.string().min(3),
  dni: z.string().min(5),
  phone: z.string().min(8),
  birthdate: z.string().refine(val => !Number.isNaN(Date.parse(val)), "Invalid date"),
});

export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;