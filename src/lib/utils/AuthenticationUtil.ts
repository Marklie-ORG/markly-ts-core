import { User } from "../entities/User.js";
import jwt from "jsonwebtoken";
import { TokenExpiration } from "../enums/enums.js";
import bcrypt from "bcryptjs";
import { OrganizationMember } from "../entities/OrganizationMember.js";
import type { Organization } from "../entities/Organization.js";
import type {
  CleanedUser,
  LoginRequestBody,
  RegistrationRequestBody,
} from "../interfaces/AuthInterfaces.js";
import { Database } from "../db/config/DB.js";

export class AuthenticationUtil {
  public static readonly ACCESS_SECRET = process.env
    .ACCESS_TOKEN_SECRET as string;

  public static readonly REFRESH_SECRET = process.env
    .REFRESH_TOKEN_SECRET as string;

  public static readonly EMAIL_CHANGE_SECRET = process.env
    .EMAIL_CHANGE_TOKEN_SECRET as string;

  public static readonly PASSWORD_RECOVERY_SECRET = process.env
    .PASSWORD_RECOVERY_TOKEN_SECRET as string;

  public static async register(body: RegistrationRequestBody) {
    const db = await Database.getInstance();

    const existingUser = await db.em.findOne(User, {
      email: body.email,
    });

    if (existingUser) {
      throw new Error("User already exists");
    }

    const newUser = new User();
    newUser.email = body.email;
    newUser.password = body.password;

    await db.em.persistAndFlush(newUser);

    return this.buildTokens(newUser);
  }

  public static verifyRefreshToken(refreshToken: string) {
    return new Promise<string | null | false>(async (resolve, reject) => {
      jwt.verify(refreshToken, this.REFRESH_SECRET, async (err, decoded) => {
        if (err || !decoded || typeof decoded === "string") {
          reject(err || "Invalid token");
          return;
        }

        const db = await Database.getInstance();
        const user = await db.em.findOne(User, { uuid: decoded.uuid });

        if (!user) {
          resolve(null);
          return;
        }

        const newAccessToken = this.signAccessToken({
          uuid: decoded.uuid,
          email: user.email,
          firstName: user.firstName,
          lastName: user.firstName,
          roles: decoded.roles,
        });

        resolve(newAccessToken);
      });
    });
  }

  public static verifyEmailChangeToken(emailChangeToken: string) {
    return new Promise<{
      userUuid: string;
      isExpired: boolean;
      newEmail: string;
    } | null>((resolve, reject) => {
      jwt.verify(emailChangeToken, this.EMAIL_CHANGE_SECRET, (err, decoded) => {
        if (err || !decoded || typeof decoded === "string" || !decoded.exp) {
          reject(err || "Invalid token");
          return;
        }

        const isExpired = Date.now() / 1000 > decoded.exp;

        resolve({
          userUuid: decoded.userUuid,
          isExpired,
          newEmail: decoded.newEmail,
        });
      });
    });
  }

  public static verifyPasswordRecoveryToken(passwordRecoveryToken: string) {
    return new Promise<{
      userUuid: string;
      isExpired: boolean;
      email: string;
      toRecoverPassword: boolean;
      passwordRecoveryToken: string;
    } | null>((resolve, reject) => {
      jwt.verify(
        passwordRecoveryToken,
        this.PASSWORD_RECOVERY_SECRET,
        (err, decoded) => {
          if (err || !decoded || typeof decoded === "string" || !decoded.exp) {
            reject(err || "Invalid token");
            return;
          }

          const isExpired = Date.now() / 1000 > decoded.exp;

          resolve({
            userUuid: decoded.userUuid,
            isExpired,
            email: decoded.email,
            toRecoverPassword: decoded.toRecoverPassword,
            passwordRecoveryToken,
          });
        },
      );
    });
  }

  public static async login(body: LoginRequestBody) {
    const db = await Database.getInstance();

    const existingUser = await db.em.findOne(User, {
      email: body.email,
    });

    if (!existingUser) {
      throw new Error(`User does not exist with email ${body.email}`);
    }

    const passwordMatch = await this.comparePasswords(
      body.password,
      existingUser.password,
    );

    if (!passwordMatch) {
      throw new Error(`Passwords don't match for user ${body.email}`);
    }

    return this.buildTokens(existingUser);
  }

  public static async getUserOrganizations(
    user: User,
  ): Promise<Organization[]> {
    const db = await Database.getInstance();

    const memberships = await db.em.find(
      OrganizationMember,
      { user },
      { populate: ["organization"] },
    );

    return memberships.map((m) => m.organization);
  }

  public static async convertPersistedToUser(user: User): Promise<CleanedUser> {
    return {
      uuid: user.uuid,
      email: user.email,
      roles: await this.getUserRoleInOrganization(user),
    };
  }

  public static signAccessToken(cleanedUser: CleanedUser) {
    const payload = {
      ...cleanedUser,
      iat: Math.floor(Date.now() / 1000),
    };
    return jwt.sign(payload, this.ACCESS_SECRET, { expiresIn: "6h" });
  }

  public static signRefreshToken(cleanedUser: CleanedUser) {
    const payload = {
      ...cleanedUser,
      iat: Math.floor(Date.now() / 1000),
    };
    return jwt.sign(payload, this.REFRESH_SECRET, {
      expiresIn: TokenExpiration.REFRESH,
    });
  }

  public static signEmailChangeToken(
    cleanedUser: CleanedUser,
    newEmail: string,
  ) {
    const payload = {
      userUuid: cleanedUser.uuid,
      newEmail,
      iat: Math.floor(Date.now() / 1000),
    };
    return jwt.sign(payload, this.EMAIL_CHANGE_SECRET, {
      expiresIn: TokenExpiration.EMAIL_CHANGE,
    });
  }

  public static signPasswordRecoveryToken(cleanedUser: CleanedUser) {
    const payload = {
      userUuid: cleanedUser.uuid,
      email: cleanedUser.email,
      toRecoverPassword: true,
      iat: Math.floor(Date.now() / 1000),
    };
    return jwt.sign(payload, this.PASSWORD_RECOVERY_SECRET, {
      expiresIn: TokenExpiration.PASSWORD_RECOVERY,
    });
  }

  private static async comparePasswords(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  }

  private static async buildTokens(user: User) {
    const cleanedUser: CleanedUser = {
      uuid: user.uuid,
      email: user.email,
      roles: await this.getUserRoleInOrganization(user),
    };

    return {
      accessToken: this.signAccessToken(cleanedUser),
      refreshToken: this.signRefreshToken(cleanedUser),
    };
  }

  public static async getUserRoleInOrganization(user: User) {
    const organizations = await this.getUserOrganizations(user);

    return await Promise.all(
      organizations.map(async (org) => {
        const db = await Database.getInstance();
        const membership = await db.em.findOne(OrganizationMember, {
          user,
          organization: org,
        });

        return {
          role: membership?.role,
          organizationUuid: org.uuid,
        };
      }),
    );
  }

  public static async fetchUserWithTokenInfo(
    token: string,
  ): Promise<User | null> {
    return await this.verifyTokenAndFetchUser(token);
  }

  public static async verifyTokenAndFetchUser(
    token: string,
  ): Promise<User | null> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, this.ACCESS_SECRET, async (err, decoded) => {
        if (err || typeof decoded === "string" || !decoded?.uuid) {
          reject(err || "Invalid token");
          return;
        }

        const db = await Database.getInstance();
        const user = await db.em.findOne(User, { uuid: decoded.uuid });

        resolve(user || null);
      });
    });
  }
}
