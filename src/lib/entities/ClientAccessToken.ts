import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { User } from "./User.js";
import { OrganizationClient } from "./OrganizationClient.js";

@Entity()
export class ClientAccessToken extends BaseEntity {
  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => OrganizationClient)
  organizationClient!: OrganizationClient;

  @Property({ type: "text" })
  token!: string;

  @Property({ type: "boolean", default: false })
  isUsed!: boolean;
}
