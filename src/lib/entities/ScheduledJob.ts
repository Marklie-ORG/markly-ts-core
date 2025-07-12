import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { SchedulingOption } from "./SchedulingOption.js";

@Entity()
export class ScheduledJob extends BaseEntity {
  @Property()
  bullJobId!: string;

  @ManyToOne(() => SchedulingOption, { unique: true })
  schedulingOption!: SchedulingOption;

  @Property({ nullable: true })
  lastRunAt: Date | null = null;
}
