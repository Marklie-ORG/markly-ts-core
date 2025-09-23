import { Entity, Property, ManyToOne, Enum, OneToMany, Collection } from "@mikro-orm/core";
import { SubscriptionPlan } from "./SubscriptionPlan.js";
import {BaseEntity} from "../BaseEntity.js";
import {Organization} from "../Organization.js";
import {SubscriptionStatus} from "../../interfaces/SubscriptionInterfaces.js";
import {UsageRecord} from "./UsageRecord.js";

@Entity()
export class OrganizationSubscription extends BaseEntity {
    @ManyToOne(() => Organization)
    organization!: Organization;

    @ManyToOne(() => SubscriptionPlan)
    plan!: SubscriptionPlan;

    @Property()
    stripeSubscriptionId!: string;

    @Property()
    stripeCustomerId!: string;

    @Enum(() => SubscriptionStatus)
    status!: SubscriptionStatus;

    @Property()
    currentPeriodStart!: Date;

    @Property()
    currentPeriodEnd!: Date;

    @Property({ nullable: true })
    canceledAt?: Date;

    @Property({ nullable: true })
    cancelAtPeriodEnd: boolean = false;

    @Property({ nullable: true })
    trialEnd?: Date;

    @OneToMany(() => UsageRecord, record => record.subscription)
    usageRecords = new Collection<UsageRecord>(this);
}