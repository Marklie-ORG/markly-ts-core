import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { OrganizationClient } from "./OrganizationClient.js";

@Entity()
export class ClientFacebookAdAccount extends BaseEntity {
  @ManyToOne(() => OrganizationClient)
  client!: OrganizationClient;

  @Property()
  adAccountId!: string;
}
