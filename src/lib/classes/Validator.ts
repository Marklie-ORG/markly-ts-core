import { match } from "path-to-regexp";
import type { Context } from "koa";
import type { MatchFunction } from "path-to-regexp";
import {z} from "zod";

export type ValidationRule = {
  path: string;
  schema: z.ZodType<any>;
  method?: string;
};

type SchemaEntry = {
  pattern: string;
  matcher: MatchFunction<Record<string, string>>;
  schema: z.ZodType<any>;
};

let schemaMap: SchemaEntry[] = [
];

export class Validator {

  public static registerRules(rules: ValidationRule[]): void {
    for (const rule of rules) {
      schemaMap.push({
        pattern: rule.path,
        matcher: match(rule.path, { decode: decodeURIComponent }),
        schema: rule.schema,
      });
    }
  }


  private static findSchema(path: string) {
    for (const entry of schemaMap) {
      const matched = entry.matcher(path);
      if (matched) {
        return { schema: entry.schema, params: matched.params };
      }
    }
    return null;
  }

  public static validateBody(ctx: Context) {
    const path = ctx.request.path;
    const hit = this.findSchema(path);
    if (!hit) {
      throw new Error(`No validation schema defined for URL ${path}`);
    }
    hit.schema.parse((ctx.request as any).body);
  }

  public static validateQuery(ctx: Context) {
    const path = ctx.request.path;
    const hit = this.findSchema(path);
    if (!hit) {
      throw new Error(`No validation schema defined for URL ${path}`);
    }
    hit.schema.parse(ctx.request.query);
  }

  public static validateRequest(ctx: Context) {
    // body for non‑GET
    if (ctx.request.method !== "GET") {
      this.validateBody(ctx);
    }
    // query if any
    if (ctx.request.querystring) {
      this.validateQuery(ctx);
    }
  }
}
