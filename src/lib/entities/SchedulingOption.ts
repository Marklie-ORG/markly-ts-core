import {
  Entity,
  Property,
  ManyToOne,
  Enum,
  Collection,
  OneToMany,
  OneToOne,
} from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { OrganizationClient } from "./OrganizationClient.js";
import { FACEBOOK_DATE_PRESETS } from "../enums/enums.js";
import { Report } from "./Report.js";
import { ScheduledJob } from "./ScheduledJob.js";

@Entity()
export class SchedulingOption extends BaseEntity {
  @Property()
  cronExpression!: string;

  @Enum(() => FACEBOOK_DATE_PRESETS)
  datePreset!: FACEBOOK_DATE_PRESETS;

  @Property({ default: true })
  isActive: boolean = true;

  @Property({ nullable: true })
  reportName?: string;

  @Property({ default: "facebook" })
  platform!: string;

  @Property({ type: "json", nullable: true })
  jobData?: Record<string, any>;

  @Property({ nullable: true })
  timezone?: string;

  @Property()
  reviewNeeded: boolean = false;

  @Property({ nullable: true })
  lastRun?: Date;

  @Property({ nullable: true })
  nextRun?: Date;

  @OneToMany(() => Report, (report) => report.schedulingOption)
  reports = new Collection<Report>(this);

  @OneToOne(() => ScheduledJob, (job) => job.schedulingOption, {
    owner: true,
    nullable: true,
  })
  scheduledJob?: ScheduledJob;

  @ManyToOne(() => OrganizationClient)
  client!: OrganizationClient;
}
