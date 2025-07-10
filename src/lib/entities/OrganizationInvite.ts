import { Entity, Property, ManyToOne } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { Organization } from "./Organization.js";

@Entity()
export class OrganizationInvite extends BaseEntity {
  @ManyToOne(() => Organization)
  organization!: Organization;

  @Property()
  code!: string; // Random generated code

  @Property()
  expiresAt!: Date;

  @Property()
  usedAt?: Date;

  @Property()
  usedBy?: string; // UUID of the user who used the invite
}
