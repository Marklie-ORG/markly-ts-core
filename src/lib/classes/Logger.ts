import { isAxiosError } from "axios";
import { createLogger, format, transports, Logger } from "winston";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import type {User} from "../entities/User.js";

export class Log {
  private static instance: Log | null = null;
  private readonly logger: Logger;
  private readonly baseName: string;
  private static sentryInitialized: boolean = false;

  private constructor(baseName: string) {
    this.baseName = baseName;

    this.initializeSentry();

    const isProduction = process.env.ENVIRONMENT === "production";

    // Enhanced log format that properly handles errors and stack traces
    const logFormat = format.printf(({ level, message, timestamp, stack, ...meta }) => {
      const namespace = isProduction
          ? this.baseName
          : level === "error"
              ? `\x1b[31m${this.baseName}\x1b[39m`
              : `\x1b[35m${this.baseName}\x1b[39m`;

      const {
        namespace: _,
        level: __,
        message: ___,
        timestamp: ____,
        stack: _____,
        ...rest
      } = meta;

      let output = `${timestamp ? `[${timestamp}] ` : ""}${namespace} ${message}`;

      // Add metadata if present (but not stack trace here)
      if (Object.keys(rest).length > 0) {
        const cleanMeta = { ...rest };
        // Remove common error properties that are handled separately
        delete cleanMeta.name;
        delete cleanMeta.code;
        delete cleanMeta.statusCode;

        if (Object.keys(cleanMeta).length > 0) {
          output += ` ${JSON.stringify(cleanMeta, null, 2)}`;
        }
      }

      // Add stack trace on new lines for better readability
      if (stack) {
        output += `\n${stack}`;
      }

      return output;
    });

    this.logger = createLogger({
      level: "debug",
      format: format.combine(
          format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
          format.errors({ stack: true }), // This ensures stack traces are captured
          logFormat,
      ),
      transports: [new transports.Console()],
    });
  }

  private initializeSentry(): void {
    if (Log.sentryInitialized) return;

    const sentryDsn = process.env.SENTRY_DSN;
    const environment = process.env.ENVIRONMENT || "development";

    if (!sentryDsn) {
      console.warn("SENTRY_DSN not found - Sentry integration disabled");
      return;
    }

    try {
      Sentry.init({
        dsn: sentryDsn,
        environment,
        integrations: [
          nodeProfilingIntegration(),
          Sentry.postgresIntegration(),
          Sentry.httpIntegration(),
        ],
        tracesSampleRate: environment === "production" ? 0.1 : 1.0,
        release: process.env.APP_VERSION || "unknown",
        beforeSendTransaction: (event) => {
          return event;
        }
      });

      Log.sentryInitialized = true;
      console.log(`Sentry initialized for environment: ${environment}`);
    } catch (error) {
      console.error("Failed to initialize Sentry:", error);
    }
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

  public debug(message: string, metadata?: any): void {
    this.logger.debug(message, {
      namespace: this.baseName,
      ...metadata,
    });
  }

  public info(message: string, metadata?: any): void {
    this.logger.info(message, {
      namespace: this.baseName,
      ...metadata,
    });

    if (Log.sentryInitialized) {
      Sentry.addBreadcrumb({
        message,
        level: "info",
        category: this.baseName,
        data: metadata,
        timestamp: Date.now() / 1000,
      });
    }
  }

  public warn(message: string, metadata?: any): void {
    this.logger.warn(message, {
      namespace: `${this.baseName}:warning`,
      ...metadata,
    });

    if (Log.sentryInitialized) {
      Sentry.addBreadcrumb({
        message,
        level: "warning",
        category: this.baseName,
        data: metadata,
        timestamp: Date.now() / 1000,
      });

      Sentry.captureMessage(message, "warning");
    }
  }

  public error(message: unknown, errorContext?: any): void {
    const logNamespace = `${this.baseName}:error`;

    if (message instanceof Error) {
      // For Error objects, pass them directly to winston with proper formatting
      this.logger.error(message.message, {
        namespace: logNamespace,
        stack: message.stack,
        name: message.name,
        ...((message as any).code && { code: (message as any).code }),
        ...((message as any).statusCode && { statusCode: (message as any).statusCode }),
        ...errorContext,
      });
    } else {
      // For non-Error objects, convert to string
      const logMessage = typeof message === "string" ? message : JSON.stringify(message, null, 2);
      this.logger.error(logMessage, {
        namespace: logNamespace,
        ...errorContext,
      });
    }

    if (Log.sentryInitialized) {
      Sentry.withScope((scope) => {
        // Set context information
        scope.setTag("component", this.baseName);
        scope.setLevel("error");

        if (errorContext) {
          Object.keys(errorContext).forEach(key => {
            scope.setContext(key, errorContext[key]);
          });
        }

        if (message instanceof Error) {
          Sentry.captureException(message);
        } else {
          const logMessage = typeof message === "string" ? message : JSON.stringify(message);
          Sentry.captureMessage(logMessage, "error");
        }
      });
    }
  }

  public catchError(error: unknown, context?: any): void {
    const logNamespace = `${this.baseName}:error`;

    if (isAxiosError(error)) {
      // Enhanced Axios error logging with readable format
      const errorMessage = `Axios Error: ${error.message}`;
      const errorDetails = {
        namespace: logNamespace,
        type: "AxiosError",
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        status: error.response?.status,
        statusText: error.response?.statusText,
        code: error.code,
        stack: error.stack,
        responseData: error.response?.data,
        requestHeaders: error.config?.headers,
        ...context,
      };

      this.logger.error(errorMessage, errorDetails);

    } else if (error instanceof Error) {
      // Enhanced Error object logging with readable stack trace
      const errorDetails = {
        namespace: logNamespace,
        type: error.constructor.name,
        name: error.name,
        stack: error.stack,
        ...((error as any).code && { code: (error as any).code }),
        ...((error as any).statusCode && { statusCode: (error as any).statusCode }),
        ...((error as any).context && { errorContext: (error as any).context }),
        ...context,
      };

      this.logger.error(error.message, errorDetails);

    } else if (typeof error === "string") {
      // String error
      this.logger.error(error, {
        namespace: logNamespace,
        type: "String",
        ...context,
      });

    } else {
      // Unknown error type
      const errorMessage = "Unknown error occurred";
      const serializedError = this.safeStringify(error);

      this.logger.error(errorMessage, {
        namespace: logNamespace,
        type: "Unknown",
        originalError: serializedError,
        ...context,
      });
    }

    // Sentry reporting
    if (Log.sentryInitialized) {
      Sentry.withScope((scope) => {
        scope.setTag("component", this.baseName);
        scope.setLevel("error");

        if (context) {
          scope.setContext("errorContext", context);
        }

        if (isAxiosError(error)) {
          scope.setTag("errorType", "AxiosError");
          scope.setContext("httpRequest", {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
          });
          scope.setContext("httpResponse", {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
          });
        } else if (error instanceof Error) {
          scope.setTag("errorType", error.constructor.name);

          if ((error as any).code) {
            scope.setTag("errorCode", (error as any).code);
          }
          if ((error as any).statusCode) {
            scope.setTag("statusCode", (error as any).statusCode);
          }
        }

        if (error instanceof Error) {
          Sentry.captureException(error);
        } else {
          const errorMessage = typeof error === "string" ? error : this.safeStringify(error);
          Sentry.captureMessage(`Caught error: ${errorMessage}`, "error");
        }
      });
    }
  }

  private safeStringify(obj: unknown): string {
    try {
      return JSON.stringify(obj, this.getCircularReplacer(), 2);
    } catch (error) {
      return `[Unable to stringify: ${String(obj)}]`;
    }
  }

  private getCircularReplacer() {
    const seen = new WeakSet();
    return (_key: string, value: any) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
      }
      return value;
    };
  }

  public extend(extensionName: string): Log {
    const extendedName = `${this.baseName}:${extensionName}`;
    return new Log(extendedName);
  }

  public static setUser(user: User): void {
    if (Log.sentryInitialized) {
      Sentry.setUser(user);
    }
  }

  public static setContext(key: string, context: any): void {
    if (Log.sentryInitialized) {
      Sentry.setContext(key, context);
    }
  }

  public static setTag(key: string, value: string): void {
    if (Log.sentryInitialized) {
      Sentry.setTag(key, value);
    }
  }

  public static captureException(error: Error, context?: any): void {
    if (Log.sentryInitialized) {
      Sentry.withScope((scope) => {
        if (context) {
          Object.keys(context).forEach(key => {
            scope.setContext(key, context[key]);
          });
        }
        Sentry.captureException(error);
      });
    }
  }

  public static startTransaction(name: string, op: string): any {
    if (Log.sentryInitialized) {
      return Sentry.startSpan({ name, op }, () => {});
    }
    return null;
  }

  public static async flush(timeout: number = 2000): Promise<boolean> {
    if (Log.sentryInitialized) {
      return await Sentry.flush(timeout);
    }
    return true;
  }

  public static async close(timeout: number = 2000): Promise<boolean> {
    if (Log.sentryInitialized) {
      return await Sentry.close(timeout);
    }
    return true;
  }
}