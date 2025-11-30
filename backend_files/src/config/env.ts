
export interface AuthConfig {
  clientId: string;
  clientSecret: string;
  signingKey: string;
  tokenTtlSeconds: number;
  adminUserIds: Set<string>;
}

export interface LoggingConfig {
  bigQueryProjectId?: string;
  bigQueryDatasetId: string;
  bigQueryTableId: string;
  retentionDays: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  environment: string;
  version: string;
}

export interface OpenAIConfig {
  apiKey: string;
}

export interface AppConfig {
  port: number;
  auth: AuthConfig;
  logging: LoggingConfig;
  openai: OpenAIConfig;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const tokenTtlSeconds = parseInteger(env.AUTH_TOKEN_TTL_SECONDS, 3600);

  const auth: AuthConfig = {
    clientId: env.AUTH_CLIENT_ID ?? "tracking-agent",
    clientSecret: env.AUTH_CLIENT_SECRET ?? "dev-secret-change-me",
    signingKey: env.AUTH_SIGNING_KEY ?? env.AUTH_CLIENT_SECRET ?? "dev-secret-change-me",
    tokenTtlSeconds,
    adminUserIds: new Set(splitCsv(env.ADMIN_USER_IDS)),
  };

  const logging: LoggingConfig = {
    bigQueryProjectId: env.BIGQUERY_PROJECT_ID,
    bigQueryDatasetId: env.BIGQUERY_DATASET_ID ?? 'logs',
    bigQueryTableId: env.BIGQUERY_TABLE_ID ?? 'activity',
    retentionDays: parseInteger(env.LOG_RETENTION_DAYS, 30),
    logLevel: (env.LOG_LEVEL as LoggingConfig['logLevel']) ?? 'info',
    environment: env.NODE_ENV ?? 'development',
    version: env.APP_VERSION ?? '0.1.0',
  };

  const openai: OpenAIConfig = {
    apiKey: env.OPENAI_API_KEY ?? "",
  };

  const port = parseInteger(env.PORT, 3000);

  return {
    port,
    auth,
    logging,
    openai,
  };
}

function parseInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseOptionalInteger(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}
function splitCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
