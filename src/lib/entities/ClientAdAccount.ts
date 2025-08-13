import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { OrganizationClient } from "./OrganizationClient.js";

@Entity()
export class ClientAdAccount extends BaseEntity {
  @Property({ default: 'facebook' })
  provider!: string;

  @Property()
  adAccountId!: string;

  @Property()
  adAccountName!: string;

  @ManyToOne(() => OrganizationClient)
  client!: OrganizationClient;

  @Property()
  businessId!: string;
}
