import type { Context } from "koa";
import type { CookieOptions } from "../interfaces/AuthInterfaces.js";

export class CookiesWrapper {
  private ctx: Context;

  constructor(ctx: Context) {
    this.ctx = ctx;
  }

  public get(name: string): string | undefined {
    return this.ctx.cookies.get(name);
  }

  public set(name: string, value: string, options?: CookieOptions): void {
    this.ctx.cookies.set(name, value, options);
  }

  public remove(name: string, options?: CookieOptions): void {
    const removeOptions: CookieOptions = { expires: new Date(0), ...options };

    this.ctx.cookies.set(name, "", removeOptions);
  }

  public static defaultRefreshCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: process.env.ENVIRONMENT === "production",
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/"
    };
  }
}
