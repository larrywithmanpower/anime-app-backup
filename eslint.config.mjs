import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Serwist 建置產物；壓過的程式碼會噴幾十筆假警告，把真的錯誤蓋掉
    "public/sw.js",
    "public/swe-worker-*.js",
  ]),
]);

export default eslintConfig;
