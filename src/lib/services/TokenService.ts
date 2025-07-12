import { ClientTokenType } from "../enums/enums.js";
import { ClientToken } from "../entities/ClientToken.js";
import { Database } from "../db/config/DB.js";
import { OrganizationClient } from "../entities/OrganizationClient.js";

export class TokenService {
  private static database: Database;

  private async getDatabase(): Promise<Database> {
    if (!TokenService.database) {
      TokenService.database = await Database.getInstance();
    }
    return TokenService.database;
  }

  async createOrUpdateToken(
      client: OrganizationClient,
      token: string,
      type: ClientTokenType,
  ) {
    const db = await this.getDatabase();

    const existing = await db.em.findOne(ClientToken, {
      organizationClient: client.uuid,
      type,
    });

    const tokenEntity = existing ?? new ClientToken();
    tokenEntity.token = token;
    tokenEntity.type = type;
    tokenEntity.organizationClient = client;
    tokenEntity.organization = client.organization;

    await db.em.persistAndFlush(tokenEntity);
  }

  async hasSlackToken(clientUuid: string): Promise<boolean> {
    const db = await this.getDatabase();

    const token = await db.em.findOne(ClientToken, {
      organizationClient: clientUuid,
      type: ClientTokenType.SLACK,
    });

    return !!token;
  }

  async getSlackToken(clientUuid: string): Promise<string> {
    const db = await this.getDatabase();

    const token = await db.em.findOne(ClientToken, {
      organizationClient: clientUuid,
      type: ClientTokenType.SLACK,
    });

    if (!token) {
      throw new Error("No Slack token found");
    }

    return token.token;
  }
}
