import {Entity, Enum, Property} from "@mikro-orm/core";
import {BaseEntity} from "./BaseEntity.js";
import {FACEBOOK_DATE_PRESETS} from "../enums/enums.js";
import type {ScheduledProviderConfig} from "../interfaces/SchedulesInterfaces.js";

@Entity()
export class SchedulingTemplate extends BaseEntity {
    @Property()
    name!: string;

    @Enum(() => FACEBOOK_DATE_PRESETS)
    datePreset!: FACEBOOK_DATE_PRESETS;

    @Property()
    frequency!: "weekly" | "biweekly" | "monthly" | "custom" | "cron";

    @Property({ nullable: true })
    time?: string;

    @Property({ nullable: true })
    dayOfWeek?: "Monday"|"Tuesday"|"Wednesday"|"Thursday"|"Friday"|"Saturday"|"Sunday";

    @Property({ nullable: true })
    dayOfMonth?: number;

    @Property({ nullable: true })
    intervalDays?: number;

    @Property({ nullable: true })
    cronExpression?: string;

    @Property({ type: 'json', nullable: true })
    providers?: ScheduledProviderConfig[];

    @Property({ type: 'json', nullable: true })
    defaultJobData?: Record<string, any>;

    @Property({ default: false })
    reviewRequired: boolean = false;

    @Property({ default: 1 })
    version: number = 1;

    @Property({ default: true })
    isActive: boolean = true;
}