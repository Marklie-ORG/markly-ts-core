import { SlackApi } from "../apis/SlackApi.js";
import { Database } from "../db/config/DB.js";
import { OrganizationClient } from "../entities/OrganizationClient.js";
import {SlackChannel} from "@lib/entities/ClientCommunicationChannel.js";

const database = await Database.getInstance();

export class SlackService {
  constructor(private tokenService: any) {}

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
    const client = await database.em.findOne(OrganizationClient, {
      uuid: clientId,
    });
    if (!client || !client.slackConversationId)
      throw new Error("Missing Slack channel ID");

    const token = await this.tokenService.getSlackToken(clientId);
    const slackApi = new SlackApi(token);

    const uploadMeta = await slackApi.getUploadUrl(fileName, pdfBuffer.length);
    await slackApi.uploadFile(uploadMeta.upload_url, pdfBuffer);
    await slackApi.completeUpload([
      { id: uploadMeta.file_id, title: fileName },
    ]);

    return await slackApi.sendMessage(
      client.slackConversationId,
      message,
      uploadMeta.file_id,
    );
  }

  async setSlackConversation(clientId: string, conversationId: string) {
    const client = await database.em.findOne(OrganizationClient, {
      uuid: clientId,
    });
    if (!client) throw new Error("Client not found");

    const token = await this.tokenService.getSlackToken(clientId);
    const slackApi = new SlackApi(token);

    if (conversationId.startsWith("C")) {
      await slackApi.joinChannel(conversationId);
    }

    let slackChannel = await database.em.findOne(SlackChannel, {
      client,
      webhookUrl: conversationId,
    });

    if (!slackChannel) {
      slackChannel = new SlackChannel();
      slackChannel.client = client;
      slackChannel.webhookUrl = conversationId;
      database.em.persist(slackChannel);
    }

    slackChannel.active = true;

    await database.em.flush();
  }

  async sendSlackMessage(clientId: string, message: string) {
    const client = await database.em.findOne(OrganizationClient, {
      uuid: clientId,
    });
    if (!client || !client.slackConversationId)
      throw new Error("Invalid Slack configuration");

    const token = await this.tokenService.getSlackToken(clientId);
    const slackApi = new SlackApi(token);

    return slackApi.sendMessage(client.slackConversationId, message);
  }
}
