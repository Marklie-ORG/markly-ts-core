import {Log} from "../classes/Logger.js";
import {WhapiApi} from "../apis/WhapiApi.js";

const logger: Log = Log.getInstance().extend("service");

export class WhapiService {

  constructor() {}

  public async sendReportWhatsapp(reportBase64: string, phoneNumber: string): Promise<void> {
    try {
        const media = `data:application/pdf;name=file.pdf;base64,${reportBase64}`;

        const whapiApi = new WhapiApi();
        await whapiApi.sendDocument({
            to: phoneNumber,
            media: media,
            mime_type: "application/pdf",
            filename: "report.pdf",
            caption: "Your Report Is Ready!",
        })

        logger.info(
            `Whatsapp message with report is sent to: ${phoneNumber}`,
        );
    }
    catch(error: any) {
      logger.error(
        "Error sending whatsapp:",
        error?.response?.body || error,
      );
      throw error;
    }
    
  }

}