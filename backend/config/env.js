const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function string(name, fallback = "") {
  const value = process.env[name];
  return value == null || value === "" ? fallback : String(value).trim();
}

function integer(name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = string(name);
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function boolean(name, fallback = false) {
  const raw = string(name);
  return raw ? TRUE_VALUES.has(raw.toLowerCase()) : fallback;
}

function csv(name, fallback = []) {
  const raw = string(name);
  return raw ? raw.split(",").map((value) => value.trim()).filter(Boolean) : fallback;
}

let cachedConfig;

export function getConfig() {
  if (cachedConfig) return cachedConfig;
  cachedConfig = Object.freeze({
    env: string("NODE_ENV", "development"),
    app: Object.freeze({
      name: string("APP_NAME", "UnnatiX SEO Autopilot"),
      url: string("APP_URL", "http://localhost:5173"),
      logLevel: string("LOG_LEVEL", "info"),
      authRequired: boolean("AUTH_REQUIRED", false),
      allowedOrigins: csv("ALLOWED_ORIGINS"),
      maxBodyBytes: integer("MAX_REQUEST_BODY_BYTES", 1_048_576, { min: 1_024, max: 10_485_760 }),
    }),
    database: Object.freeze({
      uri: string("MONGO_URL"),
      name: string("DB_NAME", "unnatix_growthx"),
      maxPoolSize: integer("MONGO_MAX_POOL_SIZE", 10, { min: 1, max: 100 }),
      minPoolSize: integer("MONGO_MIN_POOL_SIZE", 0, { min: 0, max: 20 }),
      connectTimeoutMs: integer("MONGO_CONNECT_TIMEOUT_MS", 10_000, { min: 1_000, max: 60_000 }),
      serverSelectionTimeoutMs: integer("MONGO_SERVER_SELECTION_TIMEOUT_MS", 8_000, { min: 1_000, max: 60_000 }),
      maxIdleTimeMs: integer("MONGO_MAX_IDLE_TIME_MS", 60_000, { min: 1_000, max: 600_000 }),
    }),
    auth: Object.freeze({
      jwtSecret: string("JWT_SECRET"),
      accessTokenSeconds: integer("ACCESS_TOKEN_TTL_SECONDS", 900, { min: 300, max: 86_400 }),
      refreshTokenSeconds: integer("REFRESH_TOKEN_TTL_SECONDS", 2_592_000, { min: 3_600, max: 7_776_000 }),
      verificationTokenSeconds: integer("VERIFICATION_TOKEN_TTL_SECONDS", 86_400, { min: 900, max: 604_800 }),
      resetTokenSeconds: integer("RESET_TOKEN_TTL_SECONDS", 3_600, { min: 300, max: 86_400 }),
      bcryptRounds: integer("BCRYPT_ROUNDS", 12, { min: 10, max: 15 }),
      secureCookies: boolean("SECURE_COOKIES", string("NODE_ENV", "development") === "production"),
      accessCookie: string("ACCESS_COOKIE_NAME", "unnatix_access"),
      refreshCookie: string("REFRESH_COOKIE_NAME", "unnatix_refresh"),
      integrationEncryptionKey: string("INTEGRATION_ENCRYPTION_KEY"),
    }),
    cron: Object.freeze({ secret: string("CRON_SECRET") }),
    ai: Object.freeze({
      providerOrder: csv("LLM_PROVIDER_ORDER", ["openai", "gemini"]),
      openAiKey: string("OPENAI_API_KEY"),
      geminiKey: string("GEMINI_API_KEY"),
      visibilityDailyQueryLimit: integer("AI_VISIBILITY_DAILY_QUERY_LIMIT", 40, { min: 1, max: 1000 }),
    }),
    integrations: Object.freeze({
      wordpressConfigured: Boolean(string("WP_SITE_URL") && string("WP_USERNAME") && string("WP_APP_PASSWORD")),
      gbpConfigured: Boolean((string("GOOGLE_GBP_ACCESS_TOKEN") || string("GOOGLE_GBP_REFRESH_TOKEN")) && string("GBP_ACCOUNT_ID") && string("GBP_LOCATION_ID")),
      cloudinaryConfigured: Boolean(string("CLOUDINARY_CLOUD_NAME") && string("CLOUDINARY_API_KEY") && string("CLOUDINARY_API_SECRET")),
      smtpConfigured: Boolean(string("SMTP_HOST") && string("SMTP_USER") && string("SMTP_PASSWORD")),
      smtp: Object.freeze({
        host: string("SMTP_HOST"), port: integer("SMTP_PORT", 587, { min: 1, max: 65535 }),
        secure: boolean("SMTP_SECURE", false), user: string("SMTP_USER"), password: string("SMTP_PASSWORD"),
        fromEmail: string("SMTP_FROM_EMAIL"), fromName: string("SMTP_FROM_NAME", "UnnatiX Technologies"),
      }),
    }),
  });
  return cachedConfig;
}

export function validateEnvironment({ strict = getConfig().env === "production" } = {}) {
  const config = getConfig();
  const errors = [];
  const warnings = [];
  if (!config.database.uri) warnings.push("MONGO_URL is not configured; persistence is disabled.");
  if (config.app.authRequired && !config.auth.jwtSecret) errors.push("JWT_SECRET is required when AUTH_REQUIRED=true.");
  if (config.app.authRequired && config.auth.jwtSecret.length < 32) errors.push("JWT_SECRET must contain at least 32 characters.");
  if (strict && config.auth.integrationEncryptionKey.length < 32) errors.push("INTEGRATION_ENCRYPTION_KEY must contain at least 32 characters in production.");
  if (strict && !config.cron.secret) errors.push("CRON_SECRET is required in production.");
  if (!config.ai.openAiKey && !config.ai.geminiKey) warnings.push("No AI provider key is configured; fallback content will be used.");
  return { valid: errors.length === 0, errors, warnings };
}

export function resetConfigForTests() {
  cachedConfig = undefined;
}
