import axios, { type AxiosInstance } from "axios";

export class WhapiApi {
  private api: AxiosInstance;
  private accessToken: string = process.env.WHAPI_API_KEY || "";

  constructor() {
    this.api = axios.create({
      baseURL: `https://gate.whapi.cloud`,
      headers: {
        "Content-Type": "application/json",
        "authorization": `Bearer ${this.accessToken}`
      },
    });
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
