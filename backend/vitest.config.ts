import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    test: {
      env: {
        DATABASE_URL: env.DATABASE_URL,
        JWT_SECRET: env.JWT_SECRET,
      },
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
      ],
    },
  };
});