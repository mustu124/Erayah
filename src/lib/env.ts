import "server-only";

import { parseEnv, serverEnvSchema } from "@/lib/env/schema";

/** All environment variables, including secrets. Server code only. */
export const env = parseEnv(serverEnvSchema, process.env);
