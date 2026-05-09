import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  BACKEND_URL: z.string().url().optional(),
  SECURITY_UPLOAD_MAX_BYTES: z.coerce.number().int().positive().max(10 * 1024 * 1024).default(5 * 1024 * 1024),
  SECURITY_UPLOAD_RATE_LIMIT_MAX: z.coerce.number().int().positive().max(100).default(10),
  SECURITY_UPLOAD_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().max(60 * 60 * 1000).default(60 * 1000),
  SECURITY_LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().max(100).default(10),
  SECURITY_LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().max(60 * 60 * 1000).default(5 * 60 * 1000),
  SECURITY_IDLE_TIMEOUT_SECONDS: z.coerce.number().int().positive().max(24 * 60 * 60).default(15 * 60),
  SECURITY_ALLOWED_ORIGINS: z.string().default("https://app.asraarealty.in,http://localhost:3000"),
});

export type SecurityEnv = z.infer<typeof envSchema>;

let cached: SecurityEnv | null = null;

export function getSecurityEnv(): SecurityEnv {
  if (cached) return cached;
  cached = envSchema.parse(process.env);
  return cached;
}

export function isProduction(): boolean {
  return getSecurityEnv().NODE_ENV === "production";
}

export function getAllowedOrigins(): string[] {
  return getSecurityEnv()
    .SECURITY_ALLOWED_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
