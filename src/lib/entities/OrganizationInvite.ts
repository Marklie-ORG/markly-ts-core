import { Entity, Property, ManyToOne } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { Organization } from "./Organization.js";

@Entity()
export class OrganizationInvite extends BaseEntity {
  @ManyToOne(() => Organization)
  organization!: Organization;

  @Property()
  code!: string;

  @Property()
  expiresAt!: Date;

  @Property()
  usedAt?: Date;

  @Property()
  usedBy?: string;
}
