// src/env/server.mjs

import { serverSchema } from "./schema.js";
import { env as clientEnv, formatErrors } from "./client.mjs";

const parsed = serverSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid server env vars:",
    ...formatErrors(parsed.error.format())
  );
  throw new Error("Invalid environment variables");
}

// Ensure no NEXT_PUBLIC_ variables leak from server side
for (let key of Object.keys(parsed.data)) {
  if (key.startsWith("NEXT_PUBLIC_")) {
    console.error("❌ Exposing server env var:", key);
    throw new Error("You are exposing a server-side env-variable");
  }
}

export const env = {
  // all validated server-side vars
  ...parsed.data,
  // plus client-side Next_PUBLIC_ vars
  ...clientEnv,
};
