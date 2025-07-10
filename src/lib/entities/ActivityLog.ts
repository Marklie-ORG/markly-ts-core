import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { Organization } from "./Organization.js";
import { User } from "./User.js";
import { OrganizationClient } from "./OrganizationClient.js";

@Entity()
export class ActivityLog extends BaseEntity {
  @Property()
  action!: string;

  @Property({ nullable: true })
  targetType?: string | null;

  @Property({ nullable: true })
  targetUuid?: string | null;

  @Property({ type: "json", nullable: true })
  metadata?: Record<string, any>;

  @Property({ default: "user" })
  actor!: "user" | "system";

  @ManyToOne(() => Organization, { nullable: true })
  organization?: Organization;

  @ManyToOne(() => User, { nullable: true })
  user?: User;

  @ManyToOne(() => OrganizationClient, { nullable: true })
  client?: OrganizationClient;
}
