import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
    "prisma",
  ],

  turbopack: {
    resolveAlias: {
      "@prisma/client/runtime/client": "./node_modules/@prisma/client/runtime/client.js",
      "@prisma/client/runtime/query_compiler_fast_bg.postgresql.mjs":
        "./node_modules/@prisma/client/runtime/query_compiler_fast_bg.postgresql.mjs",
      "@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.mjs":
        "./node_modules/@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.mjs",
    },
  },
};

export default nextConfig;
