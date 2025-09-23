import {Collection, Entity, Enum, OneToMany, Property} from "@mikro-orm/core";
import {BaseEntity} from "../BaseEntity.js";
import {OrganizationSubscription} from "./OrganizationSubscription.js";
import {PlanInterval, PlanTier} from "../../interfaces/SubscriptionInterfaces.js";

@Entity()
export class SubscriptionPlan extends BaseEntity {
    @Property()
    name!: string;

    @Property({ type: "text", nullable: true })
    description?: string;

    @Enum(() => PlanTier)
    tier!: PlanTier;

    @Property()
    stripePriceId!: string;

    @Property()
    stripeProductId!: string;

    @Property({ type: "decimal", precision: 10, scale: 2 })
    price!: number;

    @Enum(() => PlanInterval)
    interval!: PlanInterval;

    @Property()
    isActive: boolean = true;

    // Client limits
    @Property()
    minClients!: number;

    @Property()
    maxClients!: number;

    // Team member limits
    @Property()
    minTeamMembers!: number;

    @Property()
    maxTeamMembers!: number;

    // Data refresh interval (in hours, null for "up to a minute")
    @Property({ nullable: true })
    dataRefreshHours?: number;

    // Feature flags
    @Property()
    hasCustomization: boolean = true;

    @Property()
    hasMetaIntegration: boolean = true;

    @Property()
    hasTiktokIntegration: boolean = true;

    @Property()
    hasPublishedLinks: boolean = false;

    @Property()
    hasLoomIntegration: boolean = false;

    @Property()
    hasAIDescription: boolean = false;

    @Property()
    hasMarklyBadge: boolean = false;

    @OneToMany(() => OrganizationSubscription, subscription => subscription.plan)
    subscriptions = new Collection<OrganizationSubscription>(this);
}