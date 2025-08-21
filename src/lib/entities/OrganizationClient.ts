import {
  Entity,
  Property,
  ManyToOne,
  OneToMany,
  Collection, Filter,
} from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { Organization } from "./Organization.js";
import { SchedulingOption } from "./SchedulingOption.js";
import { ClientAdAccount } from "./ClientAdAccount.js";
import { CommunicationChannel } from "./ClientCommunicationChannel.js";

@Filter({ name: 'softDelete', cond: { deletedAt: null } })
@Entity()
export class OrganizationClient extends BaseEntity {
  @Property()
  name!: string;

  @ManyToOne(() => Organization)
  organization!: Organization;

  @OneToMany(
    () => ClientAdAccount,
    (adAccounts: ClientAdAccount) => adAccounts.client,
  )
  adAccounts? = new Collection<ClientAdAccount>(this);

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

  @Property({ nullable: true })
  deletedAt?: Date;
}
