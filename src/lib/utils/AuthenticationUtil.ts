import { User } from "../entities/User.js";
import jwt, { type JwtPayload, type VerifyErrors } from "jsonwebtoken";
import { TokenExpiration } from "../enums/enums.js";
import bcrypt from "bcryptjs";
import { OrganizationMember } from "../entities/OrganizationMember.js";
import type { Organization } from "../entities/Organization.js";
import type {CleanedUser, LoginRequestBody, RegistrationRequestBody} from "../interfaces/AuthInterfaces.js";
import { Database } from "../db/config/DB.js";

const database: Database = await Database.getInstance();

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
    const existingUser: User | null = await database.em.findOne(User, {
      email: body.email,
    });

    if (existingUser) {
      throw new Error("User already exists");
    }

    const newUser: User = new User();

    newUser.email = body.email;
    newUser.password = body.password; //hashed before creating via @BeforeCreate

    await database.em.persist(newUser).flush();

    return this.buildTokens(newUser);
  }

  public static verifyRefreshToken(refreshToken: string) {
    return new Promise<string | null | false>((resolve, reject) => {
      jwt.verify(
        refreshToken,
        this.REFRESH_SECRET,
        async (
          err: VerifyErrors | null,
          decoded: JwtPayload | string | undefined,
        ) => {
          if (err) {
            reject(err);
            return;
          }

          if (!decoded || typeof decoded === "string") {
            resolve(null);
            return;
          }

          const user = await database.em.findOne(User, {
            uuid: decoded.uuid,
          });

          if (!user) {
            resolve(null);
            return;
          }

          const newAccessToken = this.signAccessToken({
            uuid: decoded.uuid,
            email: user.email,
            roles: decoded.roles,
          });

          resolve(newAccessToken);
        },
      );
    });
  }

  public static verifyEmailChangeToken(emailChangeToken: string) {
    return new Promise<{
      userUuid: string;
      isExpired: boolean;
      newEmail: string;
    } | null>((resolve, reject) => {
      jwt.verify(
        emailChangeToken,
        this.EMAIL_CHANGE_SECRET,
        async (
          err: VerifyErrors | null,
          decoded: JwtPayload | string | undefined,
        ) => {
          if (err) {
            reject(err);
            return;
          }

          if (
            !decoded || 
            typeof decoded === "string" ||
            !decoded.exp 
          ) {
            resolve(null);
            return;
          }

          const isExpired = Date.now() / 1000 > decoded.exp;

          resolve({userUuid: decoded.userUuid, isExpired, newEmail: decoded.newEmail});
        },
      );
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
        async (
          err: VerifyErrors | null,
          decoded: JwtPayload | string | undefined,
        ) => {
          if (err) {
            reject(err);
            return;
          }

          if (
            !decoded || 
            typeof decoded === "string" ||
            !decoded.exp 
          ) {
            resolve(null);
            return;
          }

          const isExpired = Date.now() / 1000 > decoded.exp;

          resolve({
            userUuid: decoded.userUuid, 
            isExpired, 
            email: decoded.email, 
            toRecoverPassword: decoded.toRecoverPassword,
            passwordRecoveryToken: passwordRecoveryToken
          });
        },
      );
    });
  }

  public static async login(body: LoginRequestBody) {
    const existingUser: User | null = await database.em.findOne(User, {
      email: body.email,
    });

    if (!existingUser) {
      throw new Error(`User does not exist with email ${body.email}`);
    }

    if (!(await this.comparePasswords(body.password, existingUser.password))) {
      throw new Error(`Passwords don't match for user ${body.email}`);
    }

    return this.buildTokens(existingUser);
  }

  public static async getUserOrganizations(
    user: User,
  ): Promise<Organization[]> {
    const organizations = await database.em.find(
      OrganizationMember,
      { user },
      { populate: ["organization"] },
    );

    return organizations.map(
      (orgMember: OrganizationMember) => orgMember.organization,
    );
  }

  public static async convertPersistedToUser(user: User): Promise<CleanedUser> {
    const cleanedUser: CleanedUser = {
      uuid: user.uuid,
      email: user.email,
      roles: await this.getUserRoleInOrganization(user),
    };

    return cleanedUser;
  }

  public static signAccessToken(cleanedUser: CleanedUser) {
    const payload = {
      ...cleanedUser,
      iat: Math.floor(Date.now() / 1000),
    };
    return jwt.sign(payload, this.ACCESS_SECRET, {
      expiresIn: '6h',
    });
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

  public static signEmailChangeToken(cleanedUser: CleanedUser, newEmail: string) {
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
    const cleanedUser = {
      uuid: user.uuid,
      email: user.email,
      roles: await this.getUserRoleInOrganization(user),
    } as CleanedUser;

    const accessToken: string = this.signAccessToken(cleanedUser);
    const refreshToken: string = this.signRefreshToken(cleanedUser);

    return { accessToken, refreshToken };
  }

  public static async getUserRoleInOrganization(user: User) {
    const organizations: Organization[] = await this.getUserOrganizations(user);

    return await Promise.all(
      organizations.map(async (organization: Organization) => {
        const role = await this.getUserOrganizationMemberships(
          user,
          organization,
        );
        return {
          role,
          organizationUuid: organization.uuid,
        };
      }),
    );
  }

  private static async getUserOrganizationMemberships(
    user: User,
    organization: Organization,
  ) {
    const organizationMember = await database.em.findOne(OrganizationMember, {
      user,
      organization,
    });

    return organizationMember?.role;
  }

  public static async fetchUserWithTokenInfo(
    token: string,
  ): Promise<User | null> {
    const userInToken: User | null | false =
      await AuthenticationUtil.verifyTokenAndFetchUser(token);
    if (
      userInToken === null ||
      !userInToken ||
      !userInToken.uuid ||
      !userInToken.uuid
    ) {
      return null;
    }
    return userInToken;
  }

  public static verifyTokenAndFetchUser(
    token: string,
  ): Promise<User | null | false> {
    return new Promise<User | null | false>((resolve, reject) => {
      jwt.verify(
        token,
        this.ACCESS_SECRET,
        (
          err: VerifyErrors | null,
          decoded: JwtPayload | string | undefined,
        ) => {
          if (err) {
            reject(err);
          }

          if (decoded === undefined) {
            resolve(null);
            return;
          }

          const user = decoded as JwtPayload;

          if (!user.uuid) {
            resolve(false);
            return;
          }

          database.em
            .findOne(User, {
              uuid: user.uuid,
            })
            .then((persistedUser: User | null) => {
              resolve(persistedUser);
            })
            .catch((e: Error) => {
              reject(e);
            });
        },
      );
    });
  }
}
