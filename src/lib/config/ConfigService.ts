import { z } from 'zod';
import { Log } from '../classes/Logger.js';

const logger = Log.getInstance().extend('config');

const baseEnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'production']).default('development'),
    PORT: z.string().default('3000').pipe(z.coerce.number()),

    // Database
    DATABASE_NAME: z.string().default('saas'),
    DATABASE_HOST: z.string().default('localhost'),
    DATABASE_PORT: z.string().default('5432').pipe(z.coerce.number()),
    DATABASE_USER: z.string().default('postgres'),
    DATABASE_PASSWORD: z.string().default('password'),

    // Redis
    REDISHOST: z.string().default('localhost'),
    REDISPORT: z.string().default('6379').pipe(z.coerce.number()),

    // Security
    ACCESS_TOKEN_SECRET: z.string().min(32),
    REFRESH_TOKEN_SECRET: z.string().min(32),
    ORG_TOKEN_SECRET_KEY: z.string(),

    // CORS
    ALLOWED_ORIGINS: z.string().transform(str => str.split(',')).default('http://localhost:3000,http://localhost:4200'),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.string().default('900000').pipe(z.coerce.number()), //15 minutos
    RATE_LIMIT_MAX_REQUESTS: z.string().default('100').pipe(z.coerce.number()),

    // GCP
    GCP_PROJECT_ID: z.string().default('saas-452909'),

    // Logging
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type BaseEnvironment = z.infer<typeof baseEnvSchema>;

export abstract class ConfigService<T extends BaseEnvironment = BaseEnvironment> {
    protected config!: T;
    private static instances = new Map<string, ConfigService>();

    protected constructor(schema: z.ZodType<T, any, any>, serviceName: string = 'default'){
        if (ConfigService.instances.has(serviceName)) {
            return ConfigService.instances.get(serviceName) as this;
        }

        try {
            this.config = schema.parse(process.env);
            logger.info(`Configuration validated for service: ${serviceName}`);
            ConfigService.instances.set(serviceName, this);
        } catch (error) {
            logger.error(`Environment validation failed for ${serviceName}:`, error);
            process.exit(1);
        }
    }

    public get<K extends keyof T>(key: K): T[K] {
        return this.config[key];
    }

    public getAll(): T {
        return { ...this.config };
    }

    public isDevelopment(): boolean {
        return this.config.NODE_ENV === 'development';
    }

    public isProduction(): boolean {
        return this.config.NODE_ENV === 'production';
    }

    public validateSection(section: keyof T): boolean {
        const value = this.config[section];
        return value !== undefined && value !== null && value !== '';
    }

    public getDatabaseConfig() {
        return {
            dbName: this.config.DATABASE_NAME,
            host: this.config.DATABASE_HOST,
            port: this.config.DATABASE_PORT,
            user: this.config.DATABASE_USER,
            password: this.config.DATABASE_PASSWORD,
        };
    }

    public getRedisConfig() {
        return {
            host: this.config.REDISHOST,
            port: this.config.REDISPORT,
        };
    }
}

export class DefaultConfigService extends ConfigService<BaseEnvironment> {
    private static instance: DefaultConfigService;

    private constructor() {
        super(baseEnvSchema, 'core');
    }

    public static getInstance(): DefaultConfigService {
        if (!DefaultConfigService.instance) {
            DefaultConfigService.instance = new DefaultConfigService();
        }
        return DefaultConfigService.instance;
    }
}

export { baseEnvSchema };