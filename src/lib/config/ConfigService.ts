import { z } from "zod";
import { Log } from "../classes/Logger.js";

const logger = Log.getInstance().extend("config-service");

// Base schema
const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  DATABASE_HOST: z.string().min(1),
  DATABASE_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  DATABASE_NAME: z.string().min(1),
  DATABASE_USER: z.string().min(1),
  DATABASE_PASSWORD: z.string().min(1),
  DATABASE_SSL: z.coerce.boolean().default(false),
  DATABASE_MAX_CONNECTIONS: z.coerce.number().int().min(1).default(10),
  DATABASE_QUERY_TIMEOUT: z.coerce.number().int().min(1000).default(30000),

  STRIPE_KEY: z.string().min(1),

  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().int().min(0).max(15).default(0),

  ACCESS_TOKEN_SECRET: z.string().min(16),
  REFRESH_TOKEN_SECRET: z.string().min(16),
  ORG_TOKEN_SECRET_KEY: z.string().length(64),

  ALLOWED_ORIGINS: z.string()
      .transform(str => str.split(",").map(origin => origin.trim()))
      .pipe(z.array(z.string()).min(1)),

  SENTRY_DSN: z.string().optional(),
  APP_VERSION: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  SENTRY_PROFILES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  SENTRY_DEBUG: z.coerce.boolean().default(false),
});

const reportsEnvSchema = baseEnvSchema.extend({
  FACEBOOK_API_VERSION: z.string().regex(/^v\d+\.\d+$/).default("v22.0"),
  FACEBOOK_API_TIMEOUT: z.coerce.number().int().min(5000).max(300000).default(30000),
  FACEBOOK_API_MAX_RETRIES: z.coerce.number().int().min(1).max(10).default(3),

  REPORT_GENERATION_TIMEOUT: z.coerce.number().int().min(30000).max(600000).default(120000),
  MAX_CONCURRENT_REPORTS: z.coerce.number().int().min(1).max(50).default(5),

  PUPPETEER_EXECUTABLE_PATH: z.string().optional(),
  PUPPETEER_TIMEOUT: z.coerce.number().int().min(30000).max(300000).default(120000),

  GCS_REPORTS_BUCKET: z.string().min(1),

  BULLMQ_REDIS_URL: z.string().optional(),
  QUEUE_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(3),
  QUEUE_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  QUEUE_BACKOFF_DELAY: z.coerce.number().int().min(1000).max(300000).default(30000),
});

const authEnvSchema = baseEnvSchema.extend({
  // Session configuration
  SESSION_TIMEOUT: z.coerce.number().int().min(300).max(86400).default(3600), // 5 min to 24 hours
  REFRESH_TOKEN_EXPIRY: z.coerce.number().int().min(86400).default(30 * 24 * 60 * 60), // 30 days default

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(100),

  VETSOCIAL_TOKEN: z.string().optional(),

  MAX_IMAGE_SIZE_MB: z.coerce.number().min(1).max(50).default(10),
  ALLOWED_IMAGE_TYPES: z
      .string()
      .default("image/jpeg,image/png,image/gif,image/webp")
      .transform(str => str.split(",").map(type => type.trim())),
});

const notificationEnvSchema = baseEnvSchema.extend({
  // Email service
  SENDGRID_API_KEY: z.string().min(1, "SendGrid API key is required"),
  EMAIL_FROM: z.email().default("noreply@marklie.com"),

  GCS_REPORTS_BUCKET: z.string().min(1),
});

export type ReportsEnvironment = z.infer<typeof reportsEnvSchema>;
export type AuthEnvironment = z.infer<typeof authEnvSchema>;
export type NotificationEnvironment = z.infer<typeof notificationEnvSchema>;

export abstract class ConfigService<T> {
  protected config: T;
  protected serviceName: string;

  protected constructor(schema: z.ZodTypeAny, serviceName: string) {
    this.serviceName = serviceName;
    this.config = this.parseAndValidate(schema);
  }

  private parseAndValidate(schema: z.ZodTypeAny): T {
    try {
      const parsed = schema.parse(process.env) as T;
      logger.info(`Configuration validated successfully for ${this.serviceName}`);
      return parsed;
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        logger.error(`Configuration validation failed for ${this.serviceName}:`);
        error.issues.forEach(err => {
          logger.error(`  - ${err.path.join('.')}: ${err.message}`);
        });
      }
      throw new Error(`Invalid configuration for ${this.serviceName}`);
    }
  }


  public get<K extends keyof T>(key: K): T[K] {
    return this.config[key];
  }

  public getAll(): Readonly<T> {
    return Object.freeze({ ...this.config });
  }

  public isDevelopment(): boolean {
    return (this.config as any).NODE_ENV === "development";
  }

  public isProduction(): boolean {
    return (this.config as any).NODE_ENV === "production";
  }

  public getSentryConfig() {
    return {
      dsn: (this.config as any).SENTRY_DSN,
      environment: (this.config as any).SENTRY_ENVIRONMENT || (this.config as any).NODE_ENV,
      version: (this.config as any).APP_VERSION,
      tracesSampleRate: (this.config as any).SENTRY_TRACES_SAMPLE_RATE,
      profilesSampleRate: (this.config as any).SENTRY_PROFILES_SAMPLE_RATE,
      debug: (this.config as any).SENTRY_DEBUG,
    };
  }

  public isSentryEnabled(): boolean {
    return !!(this.config as any).SENTRY_DSN;
  }
}

export class ReportsConfigService extends ConfigService<ReportsEnvironment> {
  private static instance: ReportsConfigService;

  private constructor() {
    super(reportsEnvSchema, "reports-service");
  }

  public static getInstance(): ReportsConfigService {
    if (!ReportsConfigService.instance) {
      ReportsConfigService.instance = new ReportsConfigService();
    }
    return ReportsConfigService.instance;
  }

  public getFacebookApiUrl(): string {
    return `https://graph.facebook.com/${this.get("FACEBOOK_API_VERSION")}/`;
  }

  public getFacebookApiConfig() {
    return {
      baseURL: this.getFacebookApiUrl(),
      timeout: this.get("FACEBOOK_API_TIMEOUT"),
      maxRetries: this.get("FACEBOOK_API_MAX_RETRIES"),
    };
  }

  public getReportGenerationConfig() {
    return {
      timeout: this.get("REPORT_GENERATION_TIMEOUT"),
      maxConcurrent: this.get("MAX_CONCURRENT_REPORTS"),
      bucketName: this.get("GCS_REPORTS_BUCKET"),
      puppeteerPath: this.get("PUPPETEER_EXECUTABLE_PATH"),
    };
  }

  public getPuppeteerConfig() {
    const executablePath = this.get("PUPPETEER_EXECUTABLE_PATH");
    const timeout = this.get("PUPPETEER_TIMEOUT");
    return {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      defaultViewport: { width: 1600, height: 1000 },
      timeout,
      ...(executablePath && { executablePath }),
    };
  }

  public getQueueConfig() {
    return {
      concurrency: this.get("QUEUE_CONCURRENCY"),
      maxAttempts: this.get("QUEUE_MAX_ATTEMPTS"),
      backoffDelay: this.get("QUEUE_BACKOFF_DELAY"),
      redisUrl: this.get("BULLMQ_REDIS_URL"),
    };
  }

  public getStorageConfig() {
    return {
      bucketName: this.get("GCS_REPORTS_BUCKET"),
    };
  }
}

export class AgencyServiceConfig extends ConfigService<AuthEnvironment> {
  private static instance: AgencyServiceConfig;

  private constructor() {
    super(authEnvSchema, "auth-service");
  }

  public static getInstance(): AgencyServiceConfig {
    if (!AgencyServiceConfig.instance) {
      AgencyServiceConfig.instance = new AgencyServiceConfig();
    }
    return AgencyServiceConfig.instance;
  }

  public getSessionConfig() {
    return {
      timeout: this.get("SESSION_TIMEOUT"),
      refreshTokenExpiry: this.get("REFRESH_TOKEN_EXPIRY"),
    };
  }

  public getRateLimitConfig() {
    return {
      windowMs: this.get("RATE_LIMIT_WINDOW_MS"),
      maxRequests: this.get("RATE_LIMIT_MAX_REQUESTS"),
    };
  }

  public getImageUploadConfig() {
    return {
      maxSizeMB: this.get("MAX_IMAGE_SIZE_MB"),
      allowedTypes: this.get("ALLOWED_IMAGE_TYPES"),
    };
  }
}

export class NotificationConfigService extends ConfigService<NotificationEnvironment> {
  private static instance: NotificationConfigService;

  private constructor() {
    super(notificationEnvSchema, "notification-service");
  }

  public static getInstance(): NotificationConfigService {
    if (!NotificationConfigService.instance) {
      NotificationConfigService.instance = new NotificationConfigService();
    }
    return NotificationConfigService.instance;
  }

  public getEmailConfig() {
    return {
      apiKey: this.get("SENDGRID_API_KEY"),
      from: this.get("EMAIL_FROM"),
    };
  }


}



export class SentryConfigService extends ConfigService<z.infer<typeof baseEnvSchema>> {
  private static instance: SentryConfigService;

  private constructor() {
    super(baseEnvSchema, "sentry-service");
  }

  public static getInstance(): SentryConfigService {
    if (!SentryConfigService.instance) {
      SentryConfigService.instance = new SentryConfigService();
    }
    return SentryConfigService.instance;
  }

  public getSentryMiddlewareConfig() {
    return {
      dsn: this.get("SENTRY_DSN"),
      environment: this.get("SENTRY_ENVIRONMENT") || this.get("NODE_ENV"),
      release: this.get("APP_VERSION"),
      tracesSampleRate: this.get("SENTRY_TRACES_SAMPLE_RATE"),
      profilesSampleRate: this.get("SENTRY_PROFILES_SAMPLE_RATE"),
      debug: this.get("SENTRY_DEBUG"),

    };
  }
}


export {
  baseEnvSchema,
  reportsEnvSchema,
  authEnvSchema,
  notificationEnvSchema,
};