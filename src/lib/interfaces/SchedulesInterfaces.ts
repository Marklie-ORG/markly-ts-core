import type {ProviderConfig, SectionType} from "./ReportsInterfaces.js";
import type {FACEBOOK_DATE_PRESETS} from "../enums/enums.js";
import type {OrganizationClient} from "../entities/OrganizationClient.js";
import type {Report} from "../entities/Report.js";

export interface ScheduleBaseConfig {
    clientUuid: string;
    organizationUuid: string;
    reportName: string;
    reviewRequired: boolean;
    datePreset: FACEBOOK_DATE_PRESETS;
    messages: Messages;
    colors: Colors;
    images?: ReportImages;
    providers?: ProviderConfig[];
}

export interface ISchedulingOption {
    uuid: string;
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
    reportName?: string;
    providers?: ProviderConfig[];
    review: Review;
    schedule: ScheduleInfo;
    customization?: Customization;
    messaging?: Messaging;
    client: OrganizationClient;
    reports?: Report[];
}


export type SchedulingOptionWithExtras =
    Omit<ISchedulingOption, "schedule"> & {
    schedule: Omit<ScheduleInfo, "nextRun" | "lastRun"> & {
        nextRun: string;
        lastRun: string;
    };
    frequency: string;
    images?: { clientLogo?: string; organizationLogo?: string };
};


export interface ReportImages {
    clientLogo: string;
    organizationLogo: string;
}

export interface Messages {
    whatsapp: string;
    slack: string;
    email: {
        title: string;
        body: string;
    };
}


export interface Colors {
    headerBackgroundColor: string;
    reportBackgroundColor: string;
}

interface TimeSettings {
    time: string;
    timeZone: string;
}

export interface ScheduleBulkActionRequest {
    uuids: string[];
}

export type ReportScheduleRequest =
    | WeeklySchedule
    | BiweeklySchedule
    | MonthlySchedule
    | CustomSchedule
    | CronSchedule;

export interface ScheduleTimeConfig {
    time: string;
    timeZone: string;
}

export interface ScheduleModifiers {
    startDate?: string;
    conditions?: string;
}

interface WeekdaySchedule extends ScheduleBaseConfig, TimeSettings {
    dayOfWeek:
        | "Monday"
        | "Tuesday"
        | "Wednesday"
        | "Thursday"
        | "Friday"
        | "Saturday"
        | "Sunday";
}

export interface WeeklySchedule extends WeekdaySchedule {
    frequency: "weekly";
}

export interface BiweeklySchedule extends WeekdaySchedule {
    frequency: "biweekly";
}

export interface MonthlySchedule extends ScheduleBaseConfig, TimeSettings {
    frequency: "monthly";
    dayOfMonth: number;
}

export interface CustomSchedule
    extends ScheduleBaseConfig,
        TimeSettings,
        ScheduleModifiers {
    frequency: "custom";
    intervalDays: number;
}
export interface CronSchedule
    extends ScheduleBaseConfig,
        TimeSettings,
        ScheduleModifiers {
    frequency: "cron";
    cronExpression: string;
}


export interface MetricValue {
    name: string;
    value: number;
    order: number;
    enabled: boolean;
}

/**
 * KPI data point
 */
export interface KpiData extends MetricValue {}

/**
 * Graph data point with time range
 */
export interface GraphData {
    date_start: string;
    date_stop: string;
    metrics: MetricValue[];
}

/**
 * Ad creative data
 */
export interface AdData {
    adId: string;
    adName: string;
    adCreativeId: string;
    thumbnailUrl: string;
    sourceUrl: string;
    metrics: MetricValue[];
}

/**
 * Campaign data
 */
export interface CampaignData {
    campaignId: string;
    campaignName: string;
    metrics: MetricValue[];
}

/**
 * Runtime data for an ad account
 */
export interface AdAccountData {
    adAccountId: string;
    adAccountName: string;
    currency: string;
    order: number;
    enabled: boolean;
    data: KpiData[] | GraphData[] | AdData[] | CampaignData[];
}

/**
 * Runtime data for a section
 */
export interface SectionData {
    key: SectionType;
    order: number;
    enabled: boolean;
    adAccounts: AdAccountData[];
}

/**
 * Complete report data
 */
export interface ReportData {
    provider: string;
    sections: SectionData[];
}

export interface Review {
    required: boolean;
    reviewedAt?: Date;
    loomUrl?: string;
}

export interface ScheduleInfo {
    timezone: string;
    lastRun?: Date;
    nextRun?: Date;
    jobId?: string;
    datePreset: FACEBOOK_DATE_PRESETS;
    cronExpression: string;
}

export interface Customization {
    colors: { headerBg: string; reportBg: string };
    logos: {
        client?: { url?: string; gcsUri?: string };
        org?: { url?: string; gcsUri?: string };
    };
    title: string;
}

export interface Messaging {
    email?: { title?: string; body?: string };
    slack?: string;
    whatsapp?: string;
}


export interface ScheduleBulkActionRequest {
    uuids: string[]
}