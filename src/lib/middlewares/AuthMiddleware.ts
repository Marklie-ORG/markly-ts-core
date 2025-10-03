import type Application from "koa";
import type { Context, Next } from "koa";
import jwt from "jsonwebtoken";
import { AuthenticationUtil } from "../utils/AuthenticationUtil.js";
import type { User } from "../entities/User.js";
import { Log } from "lib/classes/Logger.js";

const logger = Log.getInstance().extend("auth-middleware");

type ExcludedEndpoint = string | RegExp;

export const AuthMiddleware = (
  excludedEndpoints: ExcludedEndpoint[] = [
    "/login",
    "/register",
    "/refresh",
    "/send-password-recovery-email",
    "/verify-password-recovery",
    "/verify-client-access",
    /^\/api\/reports\/[0-9a-fA-F-]{36}$/
  ],
): Application.Middleware<
  Application.DefaultState,
  Application.DefaultContext
> => {
  return async (ctx: Context, next: Next) => {
    
    const isExcluded = excludedEndpoints.some((endpoint) => {
      if (endpoint instanceof RegExp) {
        return endpoint.test(ctx.path) && ctx.method === "GET";
      }
      return ctx.path === endpoint || ctx.path.startsWith(`${endpoint}/`);
    });

    if (isExcluded) {
      return next();
    }

    const authHeader = ctx.get("Authorization");
    const token: string | undefined = authHeader?.split(" ")[1];

    if (!token) {
      ctx.throw(401, "No token provided");
    }

    const tokenPayload = jwt.decode(token);

    logger.info("tokenPayload", tokenPayload);

    if (!tokenPayload || typeof tokenPayload === "string") {
      ctx.throw(401, "Invalid token");
    }

    if (tokenPayload.isClientAccessToken) {
      if (isClientAccessEndpoint(ctx)) {
        ctx.state.isClientAccessToken = true;
        return next();
      }
      else {
        ctx.throw(403, "Forbidden");
      }
      
    }

    try {
      const user: User | null =
        await AuthenticationUtil.fetchUserWithTokenInfo(token);
      if (!user) {
        ctx.throw(401, "Unauthorized");
      } else {
        ctx.state.user = user;
        await next();
      }
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        ctx.throw(401, "Token expired");
      } else {
        ctx.throw(401, "Invalid token");
      }
    }
  };
};

const isClientAccessEndpoint = (ctx: Context) => {
  return (ctx.path.includes("/api/reports/client/") && ctx.method === "GET") ||
    (ctx.path.includes("/pdf") && ctx.method === "GET")
  // || (ctx.path.includes("/api/reports/client/") && ctx.method === "POST");
}