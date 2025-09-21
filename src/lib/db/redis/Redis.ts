import { Log } from "../../classes/Logger.js";
import { Redis } from "ioredis";
import type { RedisOptions } from "ioredis";

const logger: Log = Log.getInstance().extend("redis-client");

export class RedisClient {
  private static instance: Redis;

  private constructor() {}

  public static getInstance(): Redis {
    if (!RedisClient.instance) {
      const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
      const REDIS_PORT = process.env.REDIS_PORT || 6379;

      const options: RedisOptions = {
        host: REDIS_HOST,
        port: Number(REDIS_PORT),
        maxRetriesPerRequest: null,
        enableAutoPipelining: true,
        connectTimeout: 5000,
        lazyConnect: false,
      };

      RedisClient.instance = new Redis(options);

      RedisClient.instance.on("connect", () => {
        logger.info("Connected to Redis");
      });
      RedisClient.instance.on("error", (err) => {
        logger.error("Redis error:", err);
      });
      logger.info(`Redis status: ${RedisClient.instance.status}`);
    }
    return RedisClient.instance;
  }

  public static async get(key: string): Promise<string | null> {
    const client = this.getInstance();
    return client.get(key);
  }

  public static async set(
      key: string,
      value: string,
      expirySeconds?: number,
  ): Promise<string> {
    const client = this.getInstance();
    if (expirySeconds) {
      return client.set(key, value, "EX", expirySeconds);
    }
    return client.set(key, value);
  }

  public static async del(key: string): Promise<number> {
    const client = this.getInstance();
    return client.del(key);
  }

  public static async getJSON<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  public static async setJSON(
      key: string,
      value: any,
      expirySeconds?: number,
  ): Promise<string> {
    return this.set(key, JSON.stringify(value), expirySeconds);
  }


  public static async waitForFill<T>(
      key: string,
      timeoutMs = 8000,
      pollMs = 150,
  ): Promise<T | null> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const v = await this.getJSON<T>(key);
      if (v) return v;
      await new Promise((r) => setTimeout(r, pollMs));
    }
    return null;
  }
}