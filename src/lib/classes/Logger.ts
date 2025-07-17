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

  public info(message: string, metadata?: any): void {
    this.logger.info(message, {
      namespace: this.baseName,
      ...metadata
    });
  }

  public warn(message: string, metadata?: any): void {
    this.logger.warn(message, {
      namespace: `${this.baseName}:warning`,
      ...metadata
    });
  }

  public error(message: unknown, errorContext?: any): void {
    const errorId = errorContext?.errorId || crypto.randomUUID();
    const logNamespace = `${this.baseName}:error`;

    let logMessage: string;
    let errorMeta: any = {
      namespace: logNamespace,
      errorId,
      ...errorContext
    };

    if (message instanceof Error) {
      logMessage = message.message;
      errorMeta.stack = message.stack;
      errorMeta.name = message.name;
    } else {
      logMessage = typeof message === "string" ? message : JSON.stringify(message);
    }

    this.logger.error(logMessage, errorMeta);
  }

  public catchError(error: unknown, context?: any): string {
    if (!error) return '';

    const errorId = crypto.randomUUID();
    const logNamespace = `${this.baseName}:error`;

    let errorDetails: any = {
      namespace: logNamespace,
      errorId,
      ...context
    };

    if (isAxiosError(error)) {
      errorDetails = {
        ...errorDetails,
        type: 'AxiosError',
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        code: error.code,
        message: error.message
      };
    } else if (error instanceof Error) {
      errorDetails = {
        ...errorDetails,
        type: error.constructor.name,
        message: error.message,
        stack: error.stack,
        ...(error as any).code && { code: (error as any).code },
        ...(error as any).statusCode && { statusCode: (error as any).statusCode },
        ...(error as any).context && { context: (error as any).context }
      };
    } else if (typeof error === "string") {
      errorDetails.message = error;
      errorDetails.type = 'String';
    } else {
      errorDetails.message = JSON.stringify(error, null, 2);
      errorDetails.type = 'Unknown';
    }

    this.logger.error('Caught error', errorDetails);
    return errorId;
  }

  public catchErrorAndLogUuid(error: unknown): string {
    return this.catchError(error);
  }

  public extend(extensionName: string): Log {
    const extendedName = `${this.baseName}:${extensionName}`;
    return new Log(extendedName);
  }
}
