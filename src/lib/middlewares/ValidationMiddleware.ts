import type { Context, Next } from "koa";
import { ZodError } from "zod";
import { Log } from "../classes/Logger.js";
import { Validator } from "../classes/Validator.js";

const logger = Log.getInstance().extend("validation-middleware");

export const ValidationMiddleware = () => {
  return async (ctx: Context, next: Next) => {
    try {
      Validator.validateRequest(ctx);
      await next();
    } catch (error) {
      if (error instanceof ZodError) {
        ctx.status = 400;
        ctx.body = {
          errors: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        };
      } else {
        logger.catchError(error);
        ctx.status = 500;
        ctx.body = {
          message: error instanceof Error ? error.message : "Internal Server Error",
        };
      }
    }
  };
};
