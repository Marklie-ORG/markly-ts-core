import { Entity, Property, ManyToOne, Embeddable, Embedded, LoadStrategy } from "@mikro-orm/core";
import {OrganizationClient} from "./OrganizationClient.js";
import { Organization } from "./Organization.js";
import {BaseEntity} from "./BaseEntity.js";
import {SchedulingOption} from "./SchedulingOption.js";

@Embeddable()
class Review {
  @Property({ default: false }) required!: boolean;
  @Property({ nullable: true }) reviewedAt?: Date;
  @Property({ nullable: true }) loomUrl?: string;
}

@Embeddable()
class StorageInfo {
  @Property({ type: "text" }) pdfGcsUri!: string;
}

@Embeddable()
class ScheduleInfo {
  @Property({ nullable: true }) schedulingOptionUuid?: string;
  @Property() timezone!: string;
  @Property({ nullable: true }) lastRun?: Date;
  @Property({ nullable: true }) nextRun?: Date;
  @Property({ nullable: true }) jobId?: string;
  @Property() datePreset!: string;
}

@Embeddable()
class Customization {
  @Property({ type: "json" }) colors!: { headerBg: string; reportBg: string };
  @Property({ type: "json" }) logos!: {
    client?: { url?: string; gcsUri?: string };
    org?: { url?: string; gcsUri?: string };
  };
  @Property() title!: string;
}

@Embeddable()
class Messaging {
  @Property({ type: "json", nullable: true }) email?: { title?: string; body?: string };
  @Property({ nullable: true }) slack?: string;
  @Property({ nullable: true }) whatsapp?: string;
  @Property() pdfFilename!: string;
}

@Entity()
export class Report extends BaseEntity {
  @ManyToOne(() => Organization, { strategy: LoadStrategy.SELECT_IN })
  organization!: Organization;

  @ManyToOne(() => OrganizationClient, { strategy: LoadStrategy.SELECT_IN })
  client!: OrganizationClient;

  @ManyToOne(() => SchedulingOption, { nullable: true })
  schedulingOption?: SchedulingOption;

  @Property() type!: string;

  @Embedded(() => Review) review!: Review;

  @Embedded(() => StorageInfo) storage!: StorageInfo;

  @Embedded(() => ScheduleInfo) schedule!: ScheduleInfo;

  @Embedded(() => Customization) customization!: Customization;

  @Embedded(() => Messaging, { nullable: true }) messaging?: Messaging;

  @Property({ type: "jsonb" })
  data!: Record<string, any>;

  @Property({ type: "jsonb", nullable: true }) extras?: Record<string, unknown>;
}