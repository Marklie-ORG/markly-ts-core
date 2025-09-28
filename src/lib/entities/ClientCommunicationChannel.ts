import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { OrganizationClient } from "./OrganizationClient.js";
import { ActivityLog } from "./ActivityLog.js";
import { SlackService } from "../services/SlackService.js";
import { TokenService } from "lib/services/TokenService.js";
import { Database } from "../db/config/DB.js";
import { sendGridService } from "../services/SendgridService.js";
import { WhapiService } from "../services/WhapiService.js";
import type {Report} from "./Report.js";

@Entity({
  discriminatorColumn: "type",
  discriminatorMap: {
    communicationChannel: "CommunicationChannel",
    email: "EmailChannel",
    slack: "SlackChannel",
    whatsapp: "WhatsAppChannel",
  },
})
export abstract class CommunicationChannel extends BaseEntity {
  @Property()
  active: boolean = true;

  @ManyToOne(() => OrganizationClient)
  client!: OrganizationClient;

  abstract send(
    report: string,
    context: { reportUuid: string; organizationUuid: string },
    dbReport: Report,
  ): Promise<void>;
}

@Entity({ discriminatorValue: "email" })
export class EmailChannel extends CommunicationChannel {
  @Property()
  emailAddress!: string;

  async send(
      report: string,
      context: { reportUuid: string; organizationUuid: string },
      dbReport: Report,
  ): Promise<void> {
    const db = await Database.getInstance();
    const original = Buffer.isBuffer(report) ? report : Buffer.from(report, "base64");
    const compressed = await sendGridService.compressForSendgrid(original, 19);

    const b64SizeMB = Math.ceil(compressed.length * 4 / 3) / (1024*1024);
    if (b64SizeMB > 19) {

      await sendGridService.sendReportEmail({
        to: this.emailAddress,
        subject: dbReport?.messaging?.email?.title ?? "Marklie Report",
        text: (dbReport?.messaging?.email?.body ?? "") + `\n\nOpen: https://marklie.com/view-report/${context.reportUuid}`,
      });
      return;
    }

    await sendGridService.sendReportEmail({
      to: this.emailAddress,
      subject: dbReport?.messaging?.email?.title ?? "Marklie Report",
      text: dbReport?.messaging?.email?.body,
      attachments: [{
        content: compressed.toString("base64"),
        filename: `${dbReport?.messaging?.pdfFilename || "report"}.pdf`,
        type: "application/pdf",
        disposition: "attachment",
      }],
    });


    const log = db.em.create(ActivityLog, {
      organization: context.organizationUuid,
      action: "report_sent",
      targetType: "report",
      targetUuid: context.reportUuid,
      client: this.client.uuid,
      actor: "system",
      metadata: { email: this.emailAddress, reportName: dbReport!.messaging!.pdfFilename },
    });
    await db.em.persistAndFlush(log);
  }
}

@Entity({ discriminatorValue: "slack" })
export class SlackChannel extends CommunicationChannel {
  @Property()
  conversationId!: string;

  async send(
    report: string,
    context: { reportUuid: string; organizationUuid: string },
    dbReport: Report,
  ): Promise<void> {
    const slackService = new SlackService(new TokenService());
    const token = await slackService.tokenService.getSlackToken(
      this.client.uuid,
    );

    await slackService.sendSlackMessageWithFile(
      token,
      this.conversationId,
        dbReport!.messaging?.slack ?? "Here is your report",
      Buffer.from(report, "base64"),
      `${dbReport!.messaging!.pdfFilename || 'report'}.pdf`,
    );

    const db = await Database.getInstance();

    const log = db.em.create(ActivityLog, {
      organization: context.organizationUuid,
      action: "report_sent",
      targetType: "report",
      targetUuid: context.reportUuid,
      client: this.client.uuid,
      actor: "system",
      metadata: { slackConversationId: this.conversationId, reportName: dbReport!.messaging!.pdfFilename },
    });

    await db.em.persistAndFlush(log);
  }
}

@Entity({ discriminatorValue: "whatsapp" })
export class WhatsAppChannel extends CommunicationChannel {
  @Property()
  phoneNumber!: string;

  async send(
    report: string,
    context: { reportUuid: string; organizationUuid: string },
    dbReport: Report,
  ): Promise<void> {
    const whapi = new WhapiService();

    const original = Buffer.isBuffer(report) ? report : Buffer.from(report, "base64");
    const compressed = await sendGridService.compressForSendgrid(original, 19);

    const b64 = compressed.toString("base64");

    await whapi.sendReportWhatsapp(b64, this.phoneNumber, dbReport!.messaging?.whatsapp ?? "Your report is ready", `${dbReport!.messaging!.pdfFilename || 'report'}.pdf`);

    const db = await Database.getInstance();

    const log = db.em.create(ActivityLog, {
      organization: context.organizationUuid,
      action: "report_sent",
      targetType: "report",
      targetUuid: context.reportUuid,
      client: this.client.uuid,
      actor: "system",
      metadata: { phoneNumber: this.phoneNumber, reportName: dbReport!.messaging!.pdfFilename },
    });

    await db.em.persistAndFlush(log);
  }
}
