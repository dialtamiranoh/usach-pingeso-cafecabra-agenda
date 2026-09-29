import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./migrations",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: "696def05-b2dd-47aa-b259-a326b3404729",
    token: process.env.CLOUDFLARE_D1_TOKEN!,
  },
});