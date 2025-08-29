import type { Context, Next } from "koa";
import * as Sentry from "@sentry/node";

export const SentryMiddleware = () => {
    return async (ctx: Context, next: Next) => {
        return await Sentry.startSpan({
            op: "http.server",
            name: `${ctx.method} ${ctx.path}`,
        }, async (span) => {
            Sentry.withScope(scope => {
                scope.setContext("request", {
                    url: ctx.url,
                    method: ctx.method,
                    headers: ctx.headers,
                    query: ctx.query,
                    ip: ctx.ip,
                    userAgent: ctx.get("User-Agent"),
                });

                if (ctx.state.user) {
                    scope.setUser({
                        uuid: ctx.state.user.uuid,
                        email: ctx.state.user.email,
                        username: `${ctx.state.user.firstName} ${ctx.state.user.lastName}`.trim(),
                    });
                }

                if (ctx.state.user?.activeOrganization) {
                    scope.setTag("organization", ctx.state.user.activeOrganization.uuid);
                    scope.setContext("organization", {
                        id: ctx.state.user.activeOrganization.uuid,
                        name: ctx.state.user.activeOrganization.name,
                    });
                }
            });

            try {
                await next();

                span?.setStatus({ code: 1 }); // OK status
                span?.setAttribute("http.status_code", ctx.status);

                if (ctx.method !== "GET" || ctx.status >= 400) {
                    Sentry.addBreadcrumb({
                        message: `${ctx.method} ${ctx.path}`,
                        level: ctx.status >= 400 ? "warning" : "info",
                        category: "http.request",
                        data: {
                            status: ctx.status,
                            method: ctx.method,
                            url: ctx.url,
                        },
                    });
                }

            } catch (error) {
                span?.setStatus({ code: 2, message: "error" });
                span?.setAttribute("http.status_code", ctx.status || 500);
                span?.setAttribute("error", "true");

                Sentry.withScope(scope => {
                    scope.setContext("errorDetails", {
                        path: ctx.path,
                        method: ctx.method,
                        status: ctx.status,
                        body: ctx.request.ctx.body,
                        params: ctx.params,
                        query: ctx.query,
                    });

                    const status = ctx.status || 500;

                    if (status >= 500) {
                        scope.setLevel("error");
                        if (error instanceof Error) {
                            Sentry.captureException(error);
                        } else {
                            Sentry.captureMessage(`Non-error thrown: ${JSON.stringify(error)}`, "error");
                        }
                    } else if (status === 401 || status === 403) {
                        scope.setLevel("warning");
                        scope.setTag("security_event", "true");
                        if (error instanceof Error) {
                            Sentry.captureException(error);
                        }
                    } else if (status >= 400) {
                        Sentry.addBreadcrumb({
                            message: `Client error: ${ctx.method} ${ctx.path}`,
                            level: "warning",
                            category: "http.error",
                            data: {
                                status,
                                error: error instanceof Error ? error.message : String(error),
                            },
                        });
                    }
                });

                throw error;
            }
        });
    };
};