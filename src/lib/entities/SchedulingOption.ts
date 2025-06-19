import { Entity, Property, ManyToOne, Enum } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { OrganizationClient } from "./OrganizationClient.js";
import { FACEBOOK_DATE_PRESETS } from "../enums/enums.js";

@Entity()
export class SchedulingOption extends BaseEntity {
  @Property()
  cronExpression!: string;

  @Enum(() => FACEBOOK_DATE_PRESETS)
  datePreset!: FACEBOOK_DATE_PRESETS;

  @Property({ default: true })
  isActive: boolean = true;

  @Property()
  reportName!: string;

  @Property()
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

  @Property({ nullable: true })
  bullJobId?: string;

  @ManyToOne(() => OrganizationClient)
  client!: OrganizationClient;
}
