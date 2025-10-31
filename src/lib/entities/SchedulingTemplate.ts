import {
    Entity, Property, Enum, Embeddable, Embedded, ManyToOne, Index
} from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { Organization } from "./Organization.js";
import type { ProviderConfig } from "../interfaces/ReportsInterfaces.js";
import { FACEBOOK_DATE_PRESETS } from "../enums/enums.js";

export enum DayOfWeek {
    Monday = "Monday",
    Tuesday = "Tuesday",
    Wednesday = "Wednesday",
    Thursday = "Thursday",
    Friday = "Friday",
    Saturday = "Saturday",
    Sunday = "Sunday",
}
export enum Frequency { weekly='weekly', biweekly='biweekly', monthly='monthly', custom='custom', cron='cron' }


export enum TemplateOrigin { SYSTEM = "system", USER = "user" }
export enum TemplateVisibility { PRIVATE = "private",  PUBLIC = "public" }

@Embeddable()
class TemplateReviewDefaults { @Property({ default: false }) required!: boolean; }

@Embeddable()
class TemplateScheduleBlueprint {
    @Property({ default: "UTC" }) timezone!: string;
    @Enum(() => FACEBOOK_DATE_PRESETS) datePreset!: FACEBOOK_DATE_PRESETS;
    @Property({ nullable: true }) time?: string;
    @Enum({ items: () => DayOfWeek, nativeEnumName: 'dayofweek' })
    dayOfWeek?: DayOfWeek;
    @Property({ nullable: true }) dayOfMonth?: number;
    @Property({ nullable: true }) intervalDays?: number;
    @Property({ nullable: true }) cronExpression?: string;
    @Enum({ items: () => Frequency, nativeEnumName: 'frequency' })
    frequency!: Frequency;}

@Embeddable()
class TemplateCustomizationDefaults {
    @Property({ type: "json", nullable: true }) colors?: { headerBg?: string; reportBg?: string };
    @Property({ type: "json", nullable: true }) logos?: {
        client?: { url?: string; gcsUri?: string }; org?: { url?: string; gcsUri?: string };
    };
    @Property({ nullable: true }) title?: string;
}

@Embeddable()
class TemplateMessagingDefaults {
    @Property({ type: "json", nullable: true }) email?: { title?: string; body?: string };
    @Property({ nullable: true }) slack?: string;
    @Property({ nullable: true }) whatsapp?: string;
    @Property({ nullable: true }) pdfFilename?: string;
}

@Entity()
@Index({ properties: ["origin", "visibility", "organization"] })
export class SchedulingTemplate extends BaseEntity {
    @Property() name!: string;
    @Property({ nullable: true }) description?: string;

    @Enum(() => TemplateOrigin) origin: TemplateOrigin = TemplateOrigin.USER;
    @ManyToOne(() => Organization, { nullable: true }) organization?: Organization;
    @Property({ nullable: true }) createdByUserUuid?: string;

    @Enum(() => TemplateVisibility) visibility: TemplateVisibility = TemplateVisibility.PRIVATE;

    @Property({ default: false }) locked: boolean = false;

    @Property({ type: "json", nullable: true }) providers?: ProviderConfig[];
    @Embedded(() => TemplateReviewDefaults) review!: TemplateReviewDefaults;
    @Embedded(() => TemplateScheduleBlueprint) schedule!: TemplateScheduleBlueprint;
    @Embedded(() => TemplateCustomizationDefaults, { nullable: true }) customization?: TemplateCustomizationDefaults;
    @Embedded(() => TemplateMessagingDefaults, { nullable: true }) messaging?: TemplateMessagingDefaults;


    @Property({ default: 1 }) version: number = 1;
    @Property({ default: true }) isActive: boolean = true;
}