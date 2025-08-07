// src/env/schema.ts
import type { ZodTypeAny } from "zod";
import { z } from "zod";

// OAuth providers and Pagotic constants
const oauthProviders = ["GOOGLE", "FACEBOOK", "LINKEDIN"] as const;
const pagoticProviders = ["PAGOTIC"] as const;

export const serverSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    // Se quiser forçar sslmode, mantenha o refine; senão comente:
    .refine((url) => url.includes("sslmode=require"), {
      message: "DATABASE_URL must include sslmode=require",
    }),
  PGSSLMODE: z
    .enum(["disable", "allow", "prefer", "require"])
    .default("require"),
  NODE_ENV: z.enum(["development", "test", "production"]),
  NEXTAUTH_SECRET:
    process.env.NODE_ENV === "production"
      ? z.string().min(1)
      : z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().trim().url(),

  // Supabase service keys (não expor no client)
  SUPABASE_SERVICE_ROLE: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),

  // Dynamic provider entries
  ...Object.fromEntries(
    [...oauthProviders, ...pagoticProviders].flatMap((provider) => {
      const entries: [string, ZodTypeAny][] = [
        [`${provider}_CLIENT_ID`, z.string().min(1)],
        [`${provider}_CLIENT_SECRET`, z.string().min(1)],
      ];
      if (provider === "PAGOTIC") {
        entries.push(["PAGOTIC_BASE_URL", z.string().url()]);
        entries.push(["PAGOTIC_USERNAME", z.string().min(1)]);
        entries.push(["PAGOTIC_PASSWORD", z.string().min(1)]);
      }
      return entries;
    }),
  ),
});

export const clientSchema = z.object({
  NEXT_PUBLIC_API_BASE: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // Expondo Supabase anon key e URL
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

// Parse and export the validated environments
export const serverEnv = serverSchema.parse(process.env);
export const clientEnv = clientSchema.parse(
  Object.fromEntries(
    Object.entries(process.env).filter(([key]) =>
      key.startsWith("NEXT_PUBLIC_"),
    ),
  ),
);
