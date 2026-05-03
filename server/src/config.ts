import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),

  // Database — required; no fallback allowed in production code
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Auth
  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET must be at least 16 characters — change the default!'),

  // AI — required; app will not start without it
  GOOGLE_AI_API_KEY: z.string().min(1, 'GOOGLE_AI_API_KEY is required to start the server'),

  // Optional
  ANTHROPIC_API_KEY: z.string().optional(),
  JUDGE0_URL: z.string().optional(),
  JUDGE0_API_KEY: z.string().optional(),
  CLIENT_URL: z.string().default('http://localhost:5173'),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('\n❌  Environment validation failed — server cannot start:\n');
    result.error.errors.forEach((e) => {
      console.error(`   ${e.path.join('.')}: ${e.message}`);
    });
    console.error('\nFix the issues above in server/.env and restart.\n');
    process.exit(1);
  }
  return result.data;
}

const config = validateEnv();
export default config;
export type AppConfig = typeof config;
