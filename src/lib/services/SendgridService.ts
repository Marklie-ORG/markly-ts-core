import type { SendEmailOptions } from "../interfaces/MailInterfaces.js";
import { Log } from "../classes/Logger.js";
import sgMail, { type MailDataRequired } from "@sendgrid/mail";

const logger: Log = Log.getInstance().extend("sendgrid-service");

export class SendGridService {
  private static instance: SendGridService;
  private readonly defaultFrom: string;

  private constructor(defaultFrom: string) {
    this.defaultFrom = defaultFrom;
    sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);
  }

  public static getInstance(
    from: string = "support@marklie.com",
  ): SendGridService {
    if (!SendGridService.instance) {
      SendGridService.instance = new SendGridService(from);
    }
    return SendGridService.instance;
  }

  public async sendEmail(options: SendEmailOptions): Promise<void> {
    try {
      await sgMail.send({
        to: options.to,
        from: options.from || this.defaultFrom,
        subject: options.subject,
        text: options.text || "",
        replyTo: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
      } as MailDataRequired);

      logger.info(
        `Email sent to: ${Array.isArray(options.to) ? options.to.join(", ") : options.to}`,
      );
    } catch (error: any) {
      logger.error("Error sending email:", error?.response?.body || error);
      throw error;
    }
  }

  public async sendReportEmail(
    options: SendEmailOptions,
    pdfBuffer: string,
  ): Promise<void> {
    try {
      await sgMail.send({
        to: options.to,
        from: options.from || this.defaultFrom,
        subject: options.subject || "Your report.",
        text: options.text || "Your report is ready!",
        replyTo: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
        attachments: [
          {
            content: pdfBuffer,
            filename: "facebook-report.pdf",
            type: "application/pdf",
            disposition: "attachment",
          },
        ],
      } as MailDataRequired);

      logger.info(
        `Report email sent to: ${Array.isArray(options.to) ? options.to.join(", ") : options.to}`,
      );
    } catch (error: any) {
      logger.error(
        "Error sending report email:",
        error?.response?.body || error,
      );
      throw error;
    }
  }

  public async sendTemplateEmail({
    to,
    templateId,
    dynamicTemplateData,
    from,
  }: {
    to: string | string[];
    templateId: string;
    dynamicTemplateData: Record<string, any>;
    from?: string;
  }): Promise<void> {
    try {
      await sgMail.send({
        to,
        from: from || this.defaultFrom,
        templateId,
        dynamicTemplateData,
      });

      logger.info(`Template email sent to: ${to}`);
    } catch (error: any) {
      logger.error("Template send error:", error?.response?.body || error);
      throw error;
    }
  }
}
export const sendGridService = SendGridService.getInstance();
