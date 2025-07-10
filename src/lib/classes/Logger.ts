import { isAxiosError } from "axios";
import * as crypto from "crypto";
import { createLogger, format, transports, Logger } from "winston";

export class Log {
  private static instance: Log | null = null;
  private readonly logger: Logger;
  private readonly baseName: string;

  private constructor(baseName: string) {
    this.baseName = baseName;
    const isProduction = process.env.ENVIRONMENT === "production";

    const logFormat = format.printf(({ level, message }) => {
      const namespace = isProduction
        ? this.baseName
        : level === "error"
          ? `\x1b[31m${this.baseName}\x1b[39m`
          : `\x1b[35m${this.baseName}\x1b[39m`;

      return `${namespace} ${message}`;
    });

    this.logger = createLogger({
      level: "debug",
      format: format.combine(logFormat),
      transports: [
        new transports.Console({
          format: format.combine(logFormat),
        }),
      ],
    });
  }

  public static getInstance(): Log {
    if (!Log.instance) {
      const baseName =
        "@saas:" +
        (process.env.npm_package_name || "package-name-not-specified");
      Log.instance = new Log(baseName);
    }
    return Log.instance;
  }

  public static extendInstance(name: string) {
    return this.getInstance().extend(name);
  }

  public debug(message: string): void {
    this.logger.debug(message, { namespace: this.baseName });
  }

  public info(message: string): void {
    this.logger.info(message, { namespace: this.baseName });
  }

  public warn(message: string): void {
    this.logger.warn(message, { namespace: `${this.baseName}:warning` });
  }

  public error(message: unknown, error?: unknown): void {
    const logNamespace = `${this.baseName}:error`;

    if (message instanceof Error) {
      this.logger.error(message.stack || message.message, {
        namespace: logNamespace,
      });
    } else {
      this.logger.error(
        typeof message === "string" ? message : JSON.stringify(message),
        {
          namespace: logNamespace,
        },
      );
    }

    if (error) {
      if (error instanceof Error) {
        this.logger.error(error.stack || error.message, {
          namespace: logNamespace,
        });
      } else if (typeof error === "object") {
        this.logger.error(JSON.stringify(error, null, 2), {
          namespace: logNamespace,
        });
      } else {
        this.logger.error(String(error), { namespace: logNamespace });
      }
    }
  }

  public catchError(error: unknown): void {
    if (!error) return;

    const logNamespace = `${this.baseName}:error`;

    if (isAxiosError(error)) {
      this.logger.error(JSON.stringify(error.toJSON(), null, 2), {
        namespace: logNamespace,
      });
    } else if (error instanceof Error) {
      this.logger.error(error.stack || error.message, {
        namespace: logNamespace,
      });
    } else if (typeof error === "string") {
      this.logger.error(error, { namespace: logNamespace });
    } else {
      this.logger.error(JSON.stringify(error, null, 2), {
        namespace: logNamespace,
      });
    }
  }

  public catchErrorAndLogUuid(error: unknown): string {
    const uuid: string = crypto.randomUUID();
    this.error(`ERROR UUID: ${uuid}`);
    this.catchError(error);
    return uuid;
  }

  public extend(extensionName: string): Log {
    const extendedName = `${this.baseName}:${extensionName}`;
    return new Log(extendedName);
  }
}
