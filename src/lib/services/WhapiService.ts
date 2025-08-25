import { Log } from "../classes/Logger.js";
import axios, { type AxiosInstance } from "axios";

const logger: Log = Log.getInstance().extend("service");

export class WhapiService {
  private api: AxiosInstance;
  private accessToken: string = process.env.WHAPI_API_KEY || "";

  constructor() {
    this.api = axios.create({
      baseURL: `https://gate.whapi.cloud`,
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${this.accessToken}`,
      },
    });
  }

  public async sendReportWhatsapp(
    reportBase64: string,
    phoneNumber: string,
    message: string,
  ): Promise<void> {
    try {
      const media = `data:application/pdf;name=file.pdf;base64,${reportBase64}`;

      await this.sendDocument({
        to: phoneNumber.replace("+", ""),
        media: media,
        mime_type: "application/pdf",
        filename: "report.pdf",
        caption: message,
      });

      logger.info(`Whatsapp message with report is sent to: ${phoneNumber}`);
    } catch (error: any) {
      logger.error("Error sending whatsapp:", error?.response?.body || error);
      throw error;
    }
  }

  public async sendDocument(params: {
    to: string;
    quoted?: string;
    ephemeral?: number;
    edit?: string;
    media: string;
    mime_type?: string;
    no_encode?: boolean;
    no_cache?: boolean;
    caption?: string;
    filename?: string;
    view_once?: boolean;
  }) {
    const response = await this.api.post("/messages/document", params);

    return response.data;
  }
}
