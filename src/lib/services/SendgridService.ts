import type {SendEmailOptions} from "../interfaces/MailInterfaces.js";
import {Log} from "../classes/Logger.js";
import sgMail, {type MailDataRequired} from "@sendgrid/mail";
import {spawn} from "node:child_process";
import {tmpdir} from "node:os";
import {join} from "node:path";
import { promises as fs } from "node:fs";

const logger: Log = Log.getInstance().extend("sendgrid-service");

export class SendGridService {
  private static instance: SendGridService;
  private readonly defaultFrom: string;

  private GS_BIN = process.platform === "win32" ? "gswin64c" : "gs";
  private SENDGRID_MAX_B64_MB = 19;
  private GS_TIMEOUT_MS = 60_000;

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
        replyTo: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
        ...(options.text && {text: options.text}),
        ...(options.html && {html: options.html}),
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

  public bytesToMB(n: number) { return n / (1024 * 1024); }
  public estBase64SizeMBFromBytes(n: number) { return this.bytesToMB(Math.ceil(n * 4 / 3)); }

  public async compressPdfWithGsToFile(
      inputPath: string,
      outPath: string,
      opts: { quality?: "/screen"|"/ebook"|"/printer"|"/prepress"; colorDpi?: number } = {}
  ): Promise<void> {
    const quality = opts.quality ?? "/printer";
    const colorDpi = opts.colorDpi ?? 150;

    const args = [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      `-dPDFSETTINGS=${quality}`,
      "-dDetectDuplicateImages=true",
      "-dDownsampleColorImages=true",
      `-dColorImageResolution=${colorDpi}`,
      "-dNOPAUSE","-dQUIET","-dBATCH",
      `-sOutputFile=${outPath}`,
      inputPath,
    ];

    await new Promise<void>((resolve, reject) => {
      const ps = spawn(this.GS_BIN, args, { stdio: ["ignore", "ignore", "pipe"] });
      let stderr = "";
      const timer = setTimeout(() => { ps.kill("SIGKILL"); }, this.GS_TIMEOUT_MS);

      ps.stderr.on("data", d => { stderr += d.toString(); });
      ps.on("error", (e) => { clearTimeout(timer); reject(e); });
      ps.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) return resolve();
        reject(new Error(`Ghostscript exited ${code}: ${stderr}`));
      });
    });
  }

  public async compressForSendgrid(pdf: Buffer, maxPayloadMB = this.SENDGRID_MAX_B64_MB) {
    if (this.estBase64SizeMBFromBytes(pdf.length) <= maxPayloadMB) return pdf;

    const inPath = join(tmpdir(), `in-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
    await fs.writeFile(inPath, pdf);

    const attempts: Array<{quality: "/printer"|"/ebook"|"/screen", dpi: number}> = [
      { quality: "/printer", dpi: 150 },
      { quality: "/ebook",   dpi: 120 },
      { quality: "/screen",  dpi: 96  },
    ];

    let bestPath = inPath;
    let bestSize = (await fs.stat(bestPath)).size;

    try {
      for (const { quality, dpi } of attempts) {
        const outPath = join(tmpdir(), `out-${quality.slice(1)}-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
        try {
          await this.compressPdfWithGsToFile(bestPath, outPath, { quality, colorDpi: dpi });
          const s = await fs.stat(outPath);

          if (s.size < bestSize) {
            bestSize = s.size;
            if (bestPath !== inPath) { try { await fs.unlink(bestPath); } catch {} }
            bestPath = outPath;
          } else {
            try { await fs.unlink(outPath); } catch {}
          }

          if (this.estBase64SizeMBFromBytes(bestSize) <= maxPayloadMB) break;
        } catch {
          try { await fs.unlink(outPath); } catch {}
        }
      }

      if (this.estBase64SizeMBFromBytes(bestSize) > maxPayloadMB) {
        return await fs.readFile(bestPath);
      }

      return await fs.readFile(bestPath);
    } finally {
      if (bestPath !== inPath) { try { await fs.unlink(inPath); } catch {} }
      try { await fs.unlink(bestPath); } catch {}
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
