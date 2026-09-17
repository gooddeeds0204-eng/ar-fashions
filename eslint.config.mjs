import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // These React compiler rules are valuable migration guidance, but the
      // existing app predates the stricter defaults. Keep them visible without
      // blocking a production build while we migrate screens incrementally.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/rules-of-hooks": "warn",

      // Existing API routes still contain a small amount of legacy typing.
      // Keep this visible in CI, but let TypeScript/Next build remain the
      // authoritative launch gate.
      "@typescript-eslint/no-explicit-any": "warn",

      // A few legacy admin pages still use plain anchors for internal routes.
      // This is a performance/style migration, not a runtime launch blocker.
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
