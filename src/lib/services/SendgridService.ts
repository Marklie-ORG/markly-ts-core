import type { SendEmailOptions } from "../interfaces/MailInterfaces.js";
import { Log } from "../classes/Logger.js";
import sgMail, { type MailDataRequired } from "@sendgrid/mail";
import {spawn} from "node:child_process";

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
      const mail: MailDataRequired = {
        to: options.to,
        from: options.from || this.defaultFrom,
        subject: options.subject || "Your report.",
        text: options.text || "Your report is ready!",
        replyTo: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments && options.attachments.length > 0
          ? options.attachments
          : [
              {
                content: pdfBuffer,
                filename: "report.pdf",
                type: "application/pdf",
                disposition: "attachment",
              },
            ],
      } as MailDataRequired;

      await sgMail.send(mail);

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

  private async compressPdfWithGs(
      pdf: Buffer,
      opts: { quality?: "/screen"|"/ebook"|"/printer"|"/prepress"; colorDpi?: number } = {}
  ): Promise<Buffer> {
    const quality = opts.quality ?? "/printer";
    const colorDpi = opts.colorDpi ?? 150;
    const binary = process.platform === "win32" ? "gswin64c" : "gs";
    const args = [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      `-dPDFSETTINGS=${quality}`,
      "-dDetectDuplicateImages=true",
      "-dDownsampleColorImages=true",
      `-dColorImageResolution=${colorDpi}`,
      "-dNOPAUSE", "-dQUIET", "-dBATCH",
      "-sOutputFile=-",
      "-"
    ];
    return new Promise<Buffer>((resolve, reject) => {
      const gs = spawn(binary, args, { stdio: ["pipe", "pipe", "pipe"] });
      const chunks: Buffer[] = [];
      let stderr = "";
      gs.stdout.on("data", d => chunks.push(d as Buffer));
      gs.stderr.on("data", d => { stderr += d.toString(); });
      gs.on("error", reject);
      gs.on("close", code => {
        if (code === 0) return resolve(Buffer.concat(chunks));
        reject(new Error(`Ghostscript exited with code ${code}: ${stderr}`));
      });
      gs.stdin.write(pdf, () => gs.stdin.end());
    });
  }

  public async compressForSendgrid(pdf: Buffer, maxPayloadMB = 19): Promise<Buffer> {
    if (this.estBase64SizeMB(pdf) <= maxPayloadMB) return pdf;
    const candidates: Array<Promise<Buffer>> = [
      this.compressPdfWithGs(pdf, { quality: "/printer", colorDpi: 150 }),
      this.compressPdfWithGs(pdf, { quality: "/ebook",   colorDpi: 120 }),
      this.compressPdfWithGs(pdf, { quality: "/screen",  colorDpi: 96  }),
    ];
    for (const p of candidates) {
      try {
        const cand = await p;
        if (this.estBase64SizeMB(cand) <= maxPayloadMB) return cand;
        pdf = cand;
      } catch { /* continue */ }
    }
    return pdf;
  }

  private bytesToMB(n: number) { return n / (1024 * 1024); }
  private estBase64SizeMB(buf: Buffer) { return this.bytesToMB(Math.ceil(buf.length * 4 / 3)); }


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
