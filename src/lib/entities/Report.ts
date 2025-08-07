import { Entity, Property, ManyToOne, LoadStrategy } from "@mikro-orm/core";
import { Organization } from "./Organization.js";
import { BaseEntity } from "./BaseEntity.js";
import { OrganizationClient } from "./OrganizationClient.js";
import { SchedulingOption } from "./SchedulingOption.js";

@Entity()
export class Report extends BaseEntity {
  @ManyToOne(() => Organization, { strategy: LoadStrategy.SELECT_IN })
  organization!: Organization;

  @ManyToOne(() => OrganizationClient, { strategy: LoadStrategy.SELECT_IN })
  client!: OrganizationClient;

  @Property()
  reportType!: string;

  @Property({ default: false })
  reviewRequired!: boolean;

  @Property({ nullable: true })
  reviewedAt?: Date;

  @Property({ type: "text" })
  gcsUrl!: string;

  @ManyToOne(() => SchedulingOption, { nullable: true })
  schedulingOption?: SchedulingOption;

  @Property({ type: "jsonb" })
  data!: Record<string, any>;

  @Property({ type: "jsonb", nullable: true })
  metadata?: Record<string, any>;
}
