import type { Context, Next } from "koa";
import { User } from "../entities/User.js";
import { OrganizationMember } from "../entities/OrganizationMember.js";
import { OrganizationRole } from "../enums/enums.js";
import { Database } from "../db/config/DB.js";

const RoleHierarchy: Record<OrganizationRole, OrganizationRole[]> = {
  [OrganizationRole.OWNER]: [OrganizationRole.EDITOR, OrganizationRole.READER],
  [OrganizationRole.EDITOR]: [OrganizationRole.READER],
  [OrganizationRole.READER]: [],
};

export const RoleMiddleware = (requiredRole: OrganizationRole) => {
  return async (ctx: Context, next: Next) => {
    const user = ctx.state.user as User;

    if (!user) {
      ctx.status = 401;
      ctx.body = { message: "Unauthorized: No user in the state" };
      return;
    }

    const database: Database = await Database.getInstance();

    const organizationMember = await database.em.findOne(OrganizationMember, {
      user: user,
      role: requiredRole,
    });

    if (
      !organizationMember ||
      (!RoleHierarchy[organizationMember.role]?.includes(requiredRole) &&
        organizationMember.role !== requiredRole)
    ) {
      ctx.status = 403;
      ctx.body = {
        message: `Forbidden: User does not have required role '${requiredRole}'`,
      };
      return;
    }

    await next();
  };
};
