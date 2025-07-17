import type { Context, Next } from "koa";
import { ZodError } from "zod";
import { Log } from "../classes/Logger.js";

const logger = Log.getInstance().extend("error-middleware");

export const ErrorMiddleware = () => {
  return async (ctx: Context, next: Next) => {
    try {
      await next();
    } catch (e: unknown) {
      logger.catchError(e);

      if (e instanceof ZodError) {
        ctx.status = 400;
        ctx.body = {
          error: "Validation Error",
          details: e.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        };
      } else {
        ctx.status = 400;
        ctx.body = {
          message: e instanceof Error ? e.message : "Internal server error",
        };
      }

      logger.error("ErrorMiddleware caught an error:", {
        message: e instanceof Error ? e.message : e,
      });
    }
  };
};
