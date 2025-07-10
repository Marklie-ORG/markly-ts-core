import {
  Entity,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
} from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { Organization } from "./Organization.js";
import { SchedulingOption } from "./SchedulingOption.js";
import { ClientFacebookAdAccount } from "./ClientFacebookAdAccount.js";

@Entity()
export class OrganizationClient extends BaseEntity {
  @Property()
  name!: string;

  @ManyToOne(() => Organization)
  organization!: Organization;

  @Property({ nullable: true })
  slackConversationId?: string;

  @OneToMany(
    () => ClientFacebookAdAccount,
    (adAccounts: ClientFacebookAdAccount) => adAccounts.client,
  )
  adAccounts? = new Collection<ClientFacebookAdAccount>(this);

  @OneToMany(
    () => SchedulingOption,
    (schedulingOption: SchedulingOption) => schedulingOption.client,
  )
  schedulingOption? = new Collection<SchedulingOption>(this);

  @Property({ type: "array", nullable: true })
  emails?: string[];

  @Property({ type: "array", nullable: true })
  phoneNumbers?: string[];
}
