import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { OrganizationClient } from "./OrganizationClient.js";

@Entity()
export class ClientAccessRequest extends BaseEntity {

  @ManyToOne(() => OrganizationClient)
  organizationClient!: OrganizationClient;

  @Property({ type: "text" })
  email!: string;

  @Property({ type: "boolean", default: false })
  isGranted!: boolean;
}
