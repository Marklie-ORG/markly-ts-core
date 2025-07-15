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
import { CommunicationChannel } from "./ClientCommunicationChannel.js";

@Entity()
export class OrganizationClient extends BaseEntity {
  @Property()
  name!: string;

  @ManyToOne(() => Organization)
  organization!: Organization;

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

  @OneToMany(
      () => "CommunicationChannel",
      (channel: CommunicationChannel) => channel.client,
  )
  communicationChannels? = new Collection<CommunicationChannel>(this);
}
