import { z } from "zod";

// Shared by next.config.ts (startup check), src/lib/env.ts (server) and
// src/lib/env/public.ts (browser). Keep this file free of side effects.

const required = z.string().trim().min(1, "is required");

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: required,
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z
    .string()
    .regex(/^rzp_(test|live)_\w+$/, "must look like rzp_test_… or rzp_live_…"),
  NEXT_PUBLIC_WHATSAPP_NUMBER: z
    .string()
    .regex(/^\d{10,15}$/, "digits only, with country code, e.g. 919876543210"),
  NEXT_PUBLIC_INSTAGRAM_URL: z.url(),
});

export const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: required,
  RAZORPAY_KEY_SECRET: required,
  RAZORPAY_WEBHOOK_SECRET: required,
  RESEND_API_KEY: z.string().regex(/^re_\w+$/, "must start with re_"),
  ORDER_EMAIL_FROM: z
    .string()
    .regex(
      /^(.+<[^@\s]+@[^@\s]+>|[^@\s]+@[^@\s]+)$/,
      'must be an email or "Name <email>"',
    ),
  OWNER_NOTIFICATION_EMAIL: z.email(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseEnv<T extends z.ZodType>(
  schema: T,
  source: Record<string, string | undefined>,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map(
      (issue) => `  • ${issue.path.join(".")}: ${issue.message}`,
    );
    throw new Error(
      `\n\n❌ Invalid environment variables:\n${lines.join("\n")}\n\n` +
        `Fill them in .env.local (see .env.example), or in the Vercel dashboard.\n`,
    );
  }
  return result.data;
}
