import { SlackApi } from "../apis/SlackApi.js";
import { Database } from "../db/config/DB.js";
import { OrganizationClient } from "../entities/OrganizationClient.js";
import { SlackChannel } from "../entities/ClientCommunicationChannel.js";

export class SlackService {
  private static database: Database;

  constructor(private tokenService: any) {}

  private async getDatabase(): Promise<Database> {
    if (!SlackService.database) {
      SlackService.database = await Database.getInstance();
    }
    return SlackService.database;
  }

  async getSlackConversations(clientUuid: string) {
    const token = await this.tokenService.getSlackToken(clientUuid);
    const slackApi = new SlackApi(token);
    const channels = await slackApi.getConversationsList();
    const users = await slackApi.getUsersList();

    return {
      channels: channels.channels
          .filter((c: { is_channel: any }) => c.is_channel)
          .map((c: { id: any; name: any }) => ({ id: c.id, name: c.name })),
      ims: users.members.map((u) => ({
        id: u.id,
        name: u.profile.real_name,
        image: u.profile.image_48,
      })),
    };
  }

  async sendSlackMessageWithFile(
      clientId: string,
      message: string,
      pdfBuffer: Buffer,
      fileName: string,
  ) {
    const db = await this.getDatabase();

    const client = await db.em.findOne(OrganizationClient, {
      uuid: clientId,
    });

    if (!client) throw new Error("Client not found");

    const slackChannel = await db.em.findOne(SlackChannel, {
      client: client,
      active: true,
    });

    if (!slackChannel) throw new Error("Slack channel not set for client");

    const token = await this.tokenService.getSlackToken(clientId);
    const slackApi = new SlackApi(token);

    const uploadMeta = await slackApi.getUploadUrl(fileName, pdfBuffer.length);
    await slackApi.uploadFile(uploadMeta.upload_url, pdfBuffer);
    await slackApi.completeUpload([
      { id: uploadMeta.file_id, title: fileName },
    ]);

    return await slackApi.sendMessage(
        slackChannel.webhookUrl,
        message,
        uploadMeta.file_id,
    );
  }


  async setSlackConversation(clientId: string, conversationId: string) {
    const db = await this.getDatabase();
    const client = await db.em.findOne(OrganizationClient, {
      uuid: clientId,
    });
    if (!client) throw new Error("Client not found");

    const token = await this.tokenService.getSlackToken(clientId);
    const slackApi = new SlackApi(token);

    if (conversationId.startsWith("C")) {
      await slackApi.joinChannel(conversationId);
    }

    let slackChannel = await db.em.findOne(SlackChannel, {
      client,
      webhookUrl: conversationId,
    });

    if (!slackChannel) {
      slackChannel = new SlackChannel();
      slackChannel.client = client;
      slackChannel.webhookUrl = conversationId;
      db.em.persist(slackChannel);
    }

    slackChannel.active = true;

    await db.em.flush();
  }

  async sendSlackMessage(clientId: string, message: string) {
    const db = await this.getDatabase();

    const client = await db.em.findOne(OrganizationClient, {
      uuid: clientId,
    });

    if (!client) throw new Error("Client not found");

    const slackChannel = await db.em.findOne(SlackChannel, {
      client,
      active: true,
    });

    if (!slackChannel) throw new Error("No active Slack channel for this client");

    const token = await this.tokenService.getSlackToken(clientId);
    const slackApi = new SlackApi(token);

    return slackApi.sendMessage(slackChannel.webhookUrl, message);
  }

}
