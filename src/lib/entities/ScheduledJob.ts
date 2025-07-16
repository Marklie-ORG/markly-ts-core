import { Entity, OneToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { SchedulingOption } from "./SchedulingOption.js";

@Entity()
export class ScheduledJob extends BaseEntity {
  @Property()
  bullJobId!: string;

  @OneToOne(() => SchedulingOption, (option) => option.scheduledJob, {
    orphanRemoval: true,
    mappedBy: "scheduledJob",
  })
  schedulingOption!: SchedulingOption;

  @Property({ nullable: true })
  lastRunAt: Date | null = null;
}
