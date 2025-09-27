import {
  Entity,
  Property,
  ManyToOne,
  OneToMany,
  Enum,
  Embeddable,
  Embedded,
  Collection,
} from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { OrganizationClient } from "./OrganizationClient.js";
import { Report } from "./Report.js";
import { FACEBOOK_DATE_PRESETS } from "../enums/enums.js";
import type { ScheduledProviderConfig } from "../interfaces/SchedulesInterfaces.js";

@Embeddable()
class SchedulingReview {
  @Property({ default: false }) required!: boolean;
}

@Embeddable()
class SchedulingScheduleInfo {
  @Property() timezone!: string;
  @Property({ nullable: true }) lastRun?: Date;
  @Property({ nullable: true }) nextRun?: Date;
  @Property({ nullable: true }) jobId?: string;
  @Property({ nullable: true }) frequency?: string;
  @Property({ nullable: true }) time?: string;

  @Enum(() => FACEBOOK_DATE_PRESETS) datePreset!: FACEBOOK_DATE_PRESETS;

  @Property() cronExpression!: string;
}

@Embeddable()
class Customization {
  @Property({ type: "json", nullable: true })
  colors?: { headerBg?: string; reportBg?: string };

  @Property({ type: "json", nullable: true })
  logos?: {
    client?: { url?: string; gcsUri?: string };
    org?: { url?: string; gcsUri?: string };
  };

  @Property({ nullable: true })
  title?: string;
}

@Embeddable()
class Messaging {
  @Property({ type: "json", nullable: true }) email?: { title?: string; body?: string };
  @Property({ nullable: true }) slack?: string;
  @Property({ nullable: true }) whatsapp?: string;

  @Property({ nullable: true }) pdfFilename?: string;
}

@Entity()
export class SchedulingOption extends BaseEntity {
  @Property({ default: true })
  isActive: boolean = true;

  @Property({ type: "json", nullable: true })
  providers?: ScheduledProviderConfig[];

  @Embedded(() => SchedulingReview)
  review!: SchedulingReview;

  @Embedded(() => SchedulingScheduleInfo)
  schedule!: SchedulingScheduleInfo;

  @Embedded(() => Customization, { nullable: true })
  customization?: Customization;

  @Embedded(() => Messaging, { nullable: true })
  messaging?: Messaging;

  @ManyToOne(() => OrganizationClient)
  client!: OrganizationClient;

  @OneToMany(() => Report, (r) => r.schedulingOption)
  reports = new Collection<Report>(this);
}