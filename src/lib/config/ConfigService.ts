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

  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().int().min(0).max(15).default(0),

  ACCESS_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  ORG_TOKEN_SECRET_KEY: z.string().length(64),

  FACEBOOK_APP_ID: z.string().min(1),
  FACEBOOK_APP_SECRET: z.string().min(1),

  ALLOWED_ORIGINS: z.string()
      .transform(str => str.split(",").map(origin => origin.trim()))
      .pipe(z.array(z.string().url()).min(1))
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
  GCS_PROJECT_ID: z.string().min(1),

  BULLMQ_REDIS_URL: z.string().url().optional(),
  QUEUE_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(3),
  QUEUE_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  QUEUE_BACKOFF_DELAY: z.coerce.number().int().min(1000).max(300000).default(30000),
});

export type ReportsEnvironment = z.infer<typeof reportsEnvSchema>;

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
      projectId: this.get("GCS_PROJECT_ID"),
    };
  }
}
