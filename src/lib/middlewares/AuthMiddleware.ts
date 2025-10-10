import type Application from "koa";
import type { Context, Next } from "koa";
import jwt from "jsonwebtoken";
import { AuthenticationUtil } from "../utils/AuthenticationUtil.js";
import type { User } from "../entities/User.js";

type ExcludedEndpoint = string | RegExp;

export const AuthMiddleware = (
  excludedEndpoints: ExcludedEndpoint[] = [
    "/login",
    "/register",
    "/refresh",
    "/send-password-recovery-email",
    "/verify-password-recovery",
    "/verify-client-access"
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

    if (!tokenPayload || typeof tokenPayload === "string") {
      ctx.throw(401, "Invalid token");
    }

    if (tokenPayload.isClientAccessToken) {
      if (isClientAccessEndpoint(ctx)) {
        try {
          const clientAccessAccessTokenVerification = await AuthenticationUtil.verifyClientAccessAccessToken(token);
          if (!clientAccessAccessTokenVerification) {
            ctx.throw(401, "Unauthorized");
          } else {
            ctx.state.isClientAccessToken = true;
            return next();
          }
        } catch(error) {
          if (error instanceof jwt.TokenExpiredError) {
            ctx.throw(401, "Token expired");
          } else {
            ctx.throw(401, "Invalid token");
          }
        }
      }
      else {
        ctx.throw(403, "Forbidden");
      }
    }

    if (tokenPayload.isSystemToken) {
      try {
        const systemAccessTokenVerification = await AuthenticationUtil.verifySystemAccessToken(token);
        if (!systemAccessTokenVerification) {
          ctx.throw(401, "Unauthorized");
        } else {
          ctx.state.isSystemToken = true;
          return next();
        }
      } catch(error) {
        if (error instanceof jwt.TokenExpiredError) {
          ctx.throw(401, "Token expired");
        } else {
          ctx.throw(401, "Invalid token");
        }
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
    (ctx.path.includes("/api/reports/") && ctx.method === "GET") ||
    (ctx.path.includes("/pdf") && ctx.method === "GET")
}