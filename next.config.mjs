// next.config.mjs
import { serverEnv } from "./src/env/schema";

const config = {
  reactStrictMode: true,
  swcMinify: true,
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "platform-lookaside.fbsbx.com" },
      { protocol: "https", hostname: "definicion.de" },
      { protocol: "https", hostname: "demo.themesberg.com" },
      { protocol: "https", hostname: "entradamaster.com" },
      { protocol: "https", hostname: "source.unsplash.com" },
      { protocol: "https", hostname: "mdueqvcazdypzlepvxoc.supabase.co" },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Expondo só as variáveis públicas necessárias ao client
  env: {
    NEXT_PUBLIC_SUPABASE_URL: serverEnv.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: serverEnv.SUPABASE_ANON_KEY,
  },
};

export default config;
