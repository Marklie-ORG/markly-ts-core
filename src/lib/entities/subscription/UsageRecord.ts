import { Entity, Property, ManyToOne, Enum } from "@mikro-orm/core";
import { OrganizationSubscription } from "./OrganizationSubscription.js";
import {BaseEntity} from "../BaseEntity.js";
import {User} from "../User.js";

export enum UsageType {
    REPORT_SENT = "report_sent",
    CLIENT_ADDED = "client_added",
    MEMBER_ADDED = "member_added",
    PUBLISHED_LINK_CREATED = "published_link_created",
    LOOM_VIDEO_CREATED = "loom_video_created",
    AI_DESCRIPTION_GENERATED = "ai_description_generated",
}

@Entity()
export class UsageRecord extends BaseEntity {
    @ManyToOne(() => OrganizationSubscription)
    subscription!: OrganizationSubscription;

    @ManyToOne(() => User, { nullable: true })
    user?: User;

    @Enum(() => UsageType)
    type!: UsageType;

    @Property()
    quantity: number = 1;

    @Property({ type: "json", nullable: true })
    metadata?: Record<string, any>;

    @Property()
    recordedAt: Date = new Date();
}