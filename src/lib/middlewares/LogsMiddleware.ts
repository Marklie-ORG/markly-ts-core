import type { Context, Next } from "koa";
import { Log } from "../classes/Logger.js";
import { ActivityLog } from "../entities/ActivityLog.js";
import { Database } from "../db/config/DB.js";
import { match, type MatchFunction } from "path-to-regexp";

const logger = Log.getInstance().extend("activity-log");

type ActivityLogEntry = {
  pattern: string;
  matcher: MatchFunction<Record<string, string>>;
  method: string;
  action: string;
  targetType?: string;
  getTargetUuid?: (ctx: any, responseBody: any) => string | undefined;
  getOrganizationUuid?: (ctx: any) => string | undefined;
  getClientUuid?: (ctx: any) => string | undefined;
  getMetadata?: (ctx: any) => any;
};

export const activityLogMap: ActivityLogEntry[] = [
  {
    pattern: "/api/reports/schedule",
    matcher: match("/api/reports/schedule", { decode: decodeURIComponent }),
    method: "POST",
    action: "created_schedule",
    targetType: "report",
    getTargetUuid: (_ctx, res) => res?.uuid,
    getOrganizationUuid: (ctx) => ctx.state.user?.organization,
    getClientUuid: (ctx) => ctx.request.body?.clientUuid,
    getMetadata: (ctx) => ctx.request.body,
  },
  {
    pattern: "/api/reports/scheduling-option/:uuid",
    matcher: match("/api/reports/scheduling-option/:uuid", {
      decode: decodeURIComponent,
    }),
    method: "PUT",
    action: "updated_schedule",
    targetType: "report",
    getTargetUuid: (ctx) => ctx.params?.uuid,
    getOrganizationUuid: (ctx) => ctx.state.user?.organization,
    getClientUuid: (ctx) => ctx.request.body?.clientUuid,
    getMetadata: (ctx) => ctx.request.body,
  },
];

export const ActivityLogMiddleware = () => {
  return async (ctx: Context, next: Next) => {
    await next();

    try {
      const { method, path, status } = ctx;
      if (status >= 400) return;

      const user = ctx.state.user;
      const organization = user?.activeOrganization;

      if (!user || !organization) return;

      const normalizedPath = path.replace(/\/+$/, "");

      const matched = activityLogMap.find((entry) => {
        if (entry.method !== method) return false;
        const matchResult = entry.matcher(normalizedPath);
        if (matchResult) {
          ctx.params = matchResult.params;
          return true;
        }
        return false;
      });

      if (!matched) return;

      const responseBody = ctx.body;

      const database: Database = await Database.getInstance();

      const log = database.em.create(ActivityLog, {
        organization: matched.getOrganizationUuid?.(ctx) || organization.uuid,
        user: user.uuid,
        action: matched.action,
        targetType: matched.targetType ?? null,
        targetUuid: matched.getTargetUuid?.(ctx, responseBody) ?? null,
        metadata: matched.getMetadata?.(ctx) ?? null,
        client: matched.getClientUuid?.(ctx) ?? null,
        actor: "user",
      });

      await database.em.persistAndFlush(log);
    } catch (error) {
      logger.catchError(error);
    }
  };
};
