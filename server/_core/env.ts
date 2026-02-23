import { z } from "zod";

const normalizedEnvSchema = z.object({
  appId: z.string().min(1, "VITE_APP_ID (or APP_ID) is required"),
  oAuthPortalUrl: z.string().url("VITE_OAUTH_PORTAL_URL must be a valid URL").optional(),
  cookieSecret: z.string().min(1, "JWT_SECRET (or COOKIE_SECRET / SESSION_SECRET) is required"),
  databaseUrl: z.string().url("DATABASE_URL (or MYSQL_URL) must be a valid URL"),
  oAuthServerUrl: z.string().url("OAUTH_SERVER_URL (or OAUTH_BASE_URL) must be a valid URL"),
  ownerOpenId: z.string().optional(),
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),
  forgeApiUrl: z.string().optional(),
  forgeApiKey: z.string().optional(),
});

const getFirstDefined = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && value !== "") return value;
  }
  return undefined;
};

// Validate environment variables
const parseEnv = () => {
  const normalized = {
    appId: getFirstDefined("VITE_APP_ID", "APP_ID"),
    oAuthPortalUrl: getFirstDefined("VITE_OAUTH_PORTAL_URL"),
    cookieSecret: getFirstDefined("JWT_SECRET", "COOKIE_SECRET", "SESSION_SECRET"),
    databaseUrl: getFirstDefined("DATABASE_URL", "MYSQL_URL"),
    oAuthServerUrl: getFirstDefined("OAUTH_SERVER_URL", "OAUTH_BASE_URL"),
    ownerOpenId: getFirstDefined("OWNER_OPEN_ID"),
    nodeEnv: getFirstDefined("NODE_ENV"),
    forgeApiUrl: getFirstDefined("BUILT_IN_FORGE_API_URL"),
    forgeApiKey: getFirstDefined("BUILT_IN_FORGE_API_KEY"),
  };

  try {
    return normalizedEnvSchema.parse(normalized);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("[ENV] Invalid environment variables:");
      error.issues.forEach((e) => {
        console.error(`  - ${e.path.join(".")}: ${e.message}`);
      });
    }
    // Return partial env to allow graceful degradation
    return normalized as z.infer<typeof normalizedEnvSchema>;
  }
};

const validatedEnv = parseEnv();

export const ENV = {
  appId: validatedEnv.appId ?? "",
  oAuthPortalUrl: validatedEnv.oAuthPortalUrl ?? (() => {
    try {
      return validatedEnv.oAuthServerUrl ? new URL(validatedEnv.oAuthServerUrl).origin : "";
    } catch {
      return "";
    }
  })(),
  cookieSecret: validatedEnv.cookieSecret ?? "",
  databaseUrl: validatedEnv.databaseUrl ?? "",
  oAuthServerUrl: validatedEnv.oAuthServerUrl ?? "",
  ownerOpenId: validatedEnv.ownerOpenId ?? "",
  isProduction: validatedEnv.nodeEnv === "production",
  forgeApiUrl: validatedEnv.forgeApiUrl ?? "",
  forgeApiKey: validatedEnv.forgeApiKey ?? "",
};
