import type { OrganizationRole } from "../enums/enums.js";

export interface RegistrationRequestBody {
  email: string;
  password: string;
}

export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
}

export interface CleanedUser {
  uuid: string;
  email: string;
  firstName?: string | undefined;
  lastName?: string | undefined;
  roles: OrganizationRoles[];
  isAdmin?: boolean;
}

export interface OrganizationRoles {
  role: OrganizationRole | undefined;
  organizationUuid: string;
}

export interface CookieOptions {
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: boolean | "lax" | "strict" | "none";
  domain?: string | undefined;
  path?: string;
}
