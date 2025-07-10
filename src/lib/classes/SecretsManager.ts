import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { Log } from "./Logger.js";

const logger = Log.getInstance().extend("gcp-secrets");

export class GCPSecretsManager {
  private static client: SecretManagerServiceClient;
  private static projectId: string = process.env.GCP_PROJECT_ID as string;

  private constructor() {}

  private static getClient(): SecretManagerServiceClient {
    if (!GCPSecretsManager.client) {
      GCPSecretsManager.client = new SecretManagerServiceClient();
      logger.info("Initialized SecretManagerServiceClient");
    }
    return GCPSecretsManager.client;
  }

  public static async createSecret(secretId: string): Promise<void> {
    const client = this.getClient();
    const [secret] = await client.createSecret({
      parent: `projects/${this.projectId}`,
      secretId,
      secret: {
        replication: {
          automatic: {},
        },
      },
    });
    logger.info(`Created secret: ${secret.name}`);
  }

  public static async addSecretVersion(
    secretName: string,
    payload: string,
  ): Promise<void> {
    const client = this.getClient();
    const [version] = await client.addSecretVersion({
      parent: secretName,
      payload: {
        data: Buffer.from(payload, "utf8"),
      },
    });
    logger.info(`Added secret version: ${version.name}`);
  }

  public static async getSecretValue(secretName: string): Promise<string> {
    const client = this.getClient();

    try {
      const [version] = await client.accessSecretVersion({
        name: `${secretName}/versions/latest`,
      });

      const secretData = version?.payload?.data?.toString();

      if (!secretData) {
        throw new Error(`No secret data found for ${secretName}`);
      }

      logger.info(`Secret ${secretName} retrieved successfully`);
      return secretData;
    } catch (error: any) {
      logger.error(`Error retrieving secret ${secretName}: ${error.message}`);
      throw error;
    }
  }
}
