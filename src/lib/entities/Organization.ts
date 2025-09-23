import { Entity, Property, OneToMany, Collection } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { OrganizationMember } from "./OrganizationMember.js";
import { OrganizationClient } from "./OrganizationClient.js";
import {OrganizationSubscription} from "./subscription/OrganizationSubscription.js";
import {PaymentMethod} from "./subscription/PaymentMethod.js";
import {SubscriptionStatus} from "../interfaces/SubscriptionInterfaces.js";

@Entity()
export class Organization extends BaseEntity {
  @Property()
  name!: string;

  @Property({ nullable: true })
  stripeCustomerId?: string | undefined;

  @OneToMany(() => OrganizationMember, (orgMember) => orgMember.organization)
  members = new Collection<OrganizationMember>(this);

  @OneToMany(() => OrganizationClient, (client) => client.organization)
  clients = new Collection<OrganizationClient>(this);

  @OneToMany(() => OrganizationSubscription, (subscription) => subscription.organization)
  subscriptions = new Collection<OrganizationSubscription>(this);

  @OneToMany(() => PaymentMethod, (pm) => pm.organization)
  paymentMethods = new Collection<PaymentMethod>(this);

  getActiveSubscription(): OrganizationSubscription | undefined {
    return this.subscriptions.getItems().find(
        sub => sub.status === SubscriptionStatus.ACTIVE || sub.status === SubscriptionStatus.TRIALING
    );
  }
}
