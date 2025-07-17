import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { OrganizationClient } from "./OrganizationClient.js";
import { ActivityLog } from "./ActivityLog.js";
import { SlackService } from "../services/SlackService.js";
import { TokenService } from "lib/services/TokenService.js";
import { Database } from "../db/config/DB.js";
import { sendGridService } from "../services/SendgridService.js";
import { WhapiService } from "../services/WhapiService.js";
import type { Messages } from "../interfaces/ReportsInterfaces.js";

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
    messages: Messages,
  ): Promise<void>;
}

@Entity({ discriminatorValue: "email" })
export class EmailChannel extends CommunicationChannel {
  @Property()
  emailAddress!: string;

  async send(
    report: string,
    context: { reportUuid: string; organizationUuid: string },
    messages: Messages,
  ): Promise<void> {
    await sendGridService.sendReportEmail(
      {
        to: this.emailAddress,
        subject: messages.email.title,
        text: messages.email.body,
      },
      report,
    );

    const db = await Database.getInstance();

    const log = db.em.create(ActivityLog, {
      organization: context.organizationUuid,
      action: "report_sent",
      targetType: "report",
      targetUuid: context.reportUuid,
      client: this.client.uuid,
      actor: "system",
      metadata: { email: this.emailAddress },
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
    messages: Messages,
  ): Promise<void> {
    const slackService = new SlackService(new TokenService());
    const token = await slackService.tokenService.getSlackToken(
      this.client.uuid,
    );

    await slackService.sendSlackMessageWithFile(
      token,
      this.conversationId,
      messages.slack,
      Buffer.from(report, "base64"),
      "report.pdf",
    );

    const db = await Database.getInstance();

    const log = db.em.create(ActivityLog, {
      organization: context.organizationUuid,
      action: "report_sent",
      targetType: "report",
      targetUuid: context.reportUuid,
      client: this.client.uuid,
      actor: "system",
      metadata: { slackConversationId: this.conversationId },
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
    messages: Messages,
  ): Promise<void> {
    const whapi = new WhapiService();

    await whapi.sendReportWhatsapp(report, this.phoneNumber, messages.whatsapp);

    const db = await Database.getInstance();

    const log = db.em.create(ActivityLog, {
      organization: context.organizationUuid,
      action: "report_sent",
      targetType: "report",
      targetUuid: context.reportUuid,
      client: this.client.uuid,
      actor: "system",
      metadata: { phoneNumber: this.phoneNumber },
    });

    await db.em.persistAndFlush(log);
  }
}
