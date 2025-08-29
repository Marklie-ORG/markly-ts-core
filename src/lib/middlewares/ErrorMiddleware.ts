import type {Context, Next} from "koa";
import {ZodError} from "zod";
import {Log} from "../classes/Logger.js";
import {MarklieError} from "../errors/Errors.js";

const logger = Log.getInstance().extend("error-middleware");

export const ErrorMiddleware = () => {
  return async (ctx: Context, next: Next) => {
    try {
      await next();
    } catch (e: unknown) {
      logger.catchError(e, {
        path: ctx.path,
        method: ctx.method,
        query: ctx.query,
        params: ctx.params,
        userAgent: ctx.get("User-Agent"),
        ip: ctx.ip,
        userId: ctx.state.user?.uuid,
        organizationId: ctx.state.user?.activeOrganization?.uuid,
      });

      if (e instanceof ZodError) {
        ctx.status = 400;
        ctx.body = {
          error: "Validation Error",
          details: e.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        };

      } else if (e instanceof MarklieError) {
        ctx.status = e.statusCode;
        ctx.body = {
          error: e.code,
          message: e.message,
          ...(process.env.NODE_ENV === "development" && {
            context: e.context,
            service: e.service,
          }),
        };

        Log.setContext("marklieError", {
          code: e.code,
          isOperational: e.isOperational,
          service: e.service,
          context: e.context,
        });

      } else if (e instanceof Error) {
        ctx.status = (e as any).statusCode || (e as any).status || 500;
        ctx.body = {
          message: e.message || "Internal server error",
          ...(process.env.NODE_ENV === "development" && {
            stack: e.stack,
          }),
        };

        Log.setTag("errorType", e.constructor.name);

      } else {
        ctx.status = 500;
        ctx.body = {
          message: "Internal server error",
          ...(process.env.NODE_ENV === "development" && {
            error: typeof e === "string" ? e : JSON.stringify(e),
          }),
        };

        Log.captureException(
            new Error(`Non-Error thrown: ${typeof e === "string" ? e : JSON.stringify(e)}`),
            { originalError: e }
        );
      }

      Log.setTag("responseStatus", ctx.status.toString());

      Log.setContext("errorResponse", {
        status: ctx.status,
        path: ctx.path,
        method: ctx.method,
        timestamp: new Date().toISOString(),
      });

      logger.error("ErrorMiddleware caught an error:", {
        message: e instanceof Error ? e.message : e,
        status: ctx.status,
        path: ctx.path,
        method: ctx.method,
      });
    }
  };
};