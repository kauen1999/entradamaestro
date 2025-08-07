// src/env/index.ts

import { serverEnv, clientEnv } from "./schema";

// Já temos serverEnv e clientEnv validados e com todos os campos:
export const env = {
  // Variáveis do lado do servidor (sem NEXT_PUBLIC_)
  ...serverEnv,

  // Variáveis públicas expostas ao cliente (NEXT_PUBLIC_*)
  ...clientEnv,
};
