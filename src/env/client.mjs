// src/env/client.mjs

import { clientEnv, clientSchema } from "./schema.js";

// Validar variáveis públicas do client
const result = clientSchema.safeParse(clientEnv);
if (!result.success) {
  console.error("❌ Invalid public env vars:", result.error.format());
  throw new Error("Invalid public environment variables");
}

// Só chaves começando com NEXT_PUBLIC_ devem estar aqui
for (let key of Object.keys(result.data)) {
  if (!key.startsWith("NEXT_PUBLIC_")) {
    console.error(`❌ Invalid public env var name: ${key}`);
    throw new Error("Invalid public environment variable name");
  }
}

// Formatação de erros para server.mjs
export const formatErrors = (errors) =>
  Object.entries(errors)
    .map(([k, v]) =>
      v?._errors ? `${k}: ${v._errors.join(", ")}` : null
    )
    .filter(Boolean);

// Exporta as variáveis públicas validadas
export const env = {
  NEXT_PUBLIC_API_BASE: result.data.NEXT_PUBLIC_API_BASE,
  NEXT_PUBLIC_APP_URL: result.data.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: result.data.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};
