import axios, { type AxiosInstance } from "axios";
import type { UsersList } from "../interfaces/SlackInterfaces.js";

export class SlackApi {
  private api: AxiosInstance;
  private accessToken: string | null = null;

  constructor(accessToken?: string) {
    this.accessToken = accessToken || null;
    this.api = axios.create({
      baseURL: `https://slack.com/api`,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  public async handleSlackLogin(code: string, redirectUri: string) {
    const response = await this.api.get("/oauth.v2.access", {
      params: {
        client_id: process.env.SLACK_CLIENT_ID,
        redirect_uri: redirectUri,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        code: code,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.data;
  }

  public async getConversationsList() {
    const response = await this.api.get("/conversations.list", {
      params: {
        types: "public_channel,private_channel,mpim",
      },
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    return response.data;
  }

  public async sendMessage(
    channel: string,
    text: string,
    report_file_id?: string,
  ) {
    const response = await this.api.post(
      "/chat.postMessage",
      {
        channel: channel,
        text: text,
        blocks: [
          {
            type: "markdown",
            text: text,
            block_id: "text",
          },
          report_file_id
            ? {
                type: "file",
                block_id: "report",
                file_id: report_file_id,
                source: "remote",
              }
            : null,
        ].filter(Boolean),
      },
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      },
    );
    return response.data;
  }

  public async getUsersList() {
    const response = await this.api.get<UsersList>("/users.list", {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    return response.data;
  }

  public async joinChannel(channelId: string) {
    const response = await this.api.post(
      "/conversations.join",
      {
        channel: channelId,
      },
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      },
    );

    return response.data;
  }

  public async getTeamInfo() {
    const response = await this.api.get("/team.info", {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    return response.data;
  }

  public async getUploadUrl(filename: string, length: number) {
    const response = await this.api.get<{
      ok: boolean;
      upload_url: string;
      file_id: string;
    }>("/files.getUploadURLExternal", {
      params: {
        filename: filename,
        length: length,
      },
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    return response.data;
  }

  public async uploadFile(url: string, pdfBuffer: Buffer) {
    // todo check here

    const response = await axios.post(url, pdfBuffer, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/pdf",
        "Content-Length": pdfBuffer.length.toString(),
      },
    });

    return response.data;
  }

  public async completeUpload(files: { id: string; title: string }[]) {
    const response = await this.api.post(
      "/files.completeUploadExternal",
      {
        files: files,
      },
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      },
    );

    return response.data;
  }
}
