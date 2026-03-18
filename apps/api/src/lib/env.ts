import { z } from "zod";

// Centralized environment validation.
// Failing fast here prevents the server from starting with missing/invalid credentials.
const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20)
});

export const env = EnvSchema.parse(process.env);

