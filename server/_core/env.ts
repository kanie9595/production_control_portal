import { z } from "zod";

// Environment variable schema for validation
const envSchema = z.object({
  VITE_APP_ID: z.string().min(1, "VITE_APP_ID is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  OAUTH_SERVER_URL: z.string().url("OAUTH_SERVER_URL must be a valid URL"),
  OWNER_OPEN_ID: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  BUILT_IN_FORGE_API_URL: z.string().optional(),
  BUILT_IN_FORGE_API_KEY: z.string().optional(),
});

// Validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("[ENV] Invalid environment variables:");
      error.errors.forEach((e) => {
        console.error(`  - ${e.path.join(".")}: ${e.message}`);
      });
    }
    // Return partial env to allow graceful degradation
    return process.env as z.infer<typeof envSchema>;
  }
};

const validatedEnv = parseEnv();

export const ENV = {
  appId: validatedEnv.VITE_APP_ID ?? "",
  cookieSecret: validatedEnv.JWT_SECRET ?? "",
  databaseUrl: validatedEnv.DATABASE_URL ?? "",
  oAuthServerUrl: validatedEnv.OAUTH_SERVER_URL ?? "",
  ownerOpenId: validatedEnv.OWNER_OPEN_ID ?? "",
  isProduction: validatedEnv.NODE_ENV === "production",
  forgeApiUrl: validatedEnv.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: validatedEnv.BUILT_IN_FORGE_API_KEY ?? "",
};
