import type {FACEBOOK_DATE_PRESETS} from "../enums/enums.js";
import type {
    CustomFormula,
    CustomMetric,
    ReportImages,
} from "./ReportsInterfaces.js";
import type {Report} from "../entities/Report.js";
import type {OrganizationClient} from "../entities/OrganizationClient.js";

export interface ScheduleBaseConfig {
    clientUuid: string;
    organizationUuid: string;
    reportName: string;
    reviewRequired: boolean;
    datePreset: FACEBOOK_DATE_PRESETS;
    messages: Messages;
    colors: Colors;
    images?: ReportImages;
    providers?: ScheduledProviderConfig[];
}

export interface Colors {
    headerBackgroundColor: string;
    reportBackgroundColor: string;
}

interface TimeSettings {
    time: string;
    timeZone: string;
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

export interface ScheduledProviderConfig {
    provider: 'facebook' | 'tiktok' | 'google';
    sections: SectionConfig[];
}

export interface SectionConfig {
    name: 'kpis' | 'graphs' | 'ads' | 'campaigns';
    order: number;
    enabled: boolean;
    adAccounts: SectionAdAccount[];
}

export interface SectionAdAccount {
    adAccountId: string;
    order: number;
    adAccountName?: string;
    enabled: boolean;
    metrics: OrderedMetric<string>[];
    customMetrics?: CustomMetric[];
    customFormulas?: CustomFormula[];
    currency: string
    adsSettings?: {
        numberOfAds: number;
        sortAdsBy: string
    }
}

export interface ScheduledAdAccountConfig {
    adAccountId: string;
    kpis: ScheduledMetricGroup<AvailableKpiMetric>;
    graphs: ScheduledMetricGroup<AvailableGraphMetric>;
    ads: ScheduledMetricGroup<AvailableAdMetric>;
    campaigns: ScheduledMetricGroup<AvailableCampaignMetric>;
}

export type SectionName = 'kpis' | 'graphs' | 'ads' | 'campaigns';

export interface SectionConfig {
    name: SectionName;
    order: number;
    adAccounts: SectionAdAccount[];
}

export interface ScheduledMetricGroup<T extends string> {
    order: number;
    metrics: OrderedMetric<T>[];
    customMetrics?: CustomMetric[];
    customFormulas?: CustomFormula[];
    adsSettings?: {
        numberOfAds: number;
        sortAdsBy: string
    }
}

export interface OrderedMetric<T extends string> {
    name: T;
    order: number;
}

export const AVAILABLE_KPI_METRICS: Record<string, string[]> = {
    spend: ["spend"],
    impressions: ["impressions"],
    clicks: ["clicks"],
    cpc: ["clicks", "spend"],
    ctr: ["clicks", "impressions"],
    cpm: ["impressions", "spend"],
    cpp: ["reach", "spend"],
    reach: ["reach"],
    purchase_roas: ["spend", "action_values"],

    conversion_value: ["action_values"],

    purchases: ["actions"],
    add_to_cart: ["actions"],
    initiated_checkouts: ["actions"],
    engagement: ["actions"],
    leads: ["actions"],
    cost_per_lead: ["spend", "actions"],

    cost_per_purchase: ["spend", "actions"],
    cost_per_add_to_cart: ["spend", "actions"],
    conversion_rate: ["clicks", "actions"],
};

export type AvailableKpiMetric = keyof typeof AVAILABLE_KPI_METRICS;

export const AVAILABLE_GRAPH_METRICS: Record<string, string[]> = {
    spend: ["spend"],
    impressions: ["impressions"],
    clicks: ["clicks"],
    cpc: ["clicks", "spend"],
    ctr: ["clicks", "impressions"],
    cpm: ["impressions", "spend"],
    cpp: ["reach", "spend"],
    reach: ["reach"],
    purchase_roas: ["spend", "action_values"],

    conversion_value: ["action_values"],

    purchases: ["actions"],
    add_to_cart: ["actions"],
    initiated_checkouts: ["actions"],
    engagement: ["actions"],
    leads: ["actions"],
    cost_per_lead: ["spend", "actions"],

    cost_per_purchase: ["spend", "actions"],
    cost_per_add_to_cart: ["spend", "actions"],
    conversion_rate: ["clicks", "actions"],
};

export type AvailableGraphMetric = keyof typeof AVAILABLE_GRAPH_METRICS;

export const AVAILABLE_ADS_METRICS: Record<string, string[]> = {
    spend: ["spend"],
    impressions: ["impressions"],
    clicks: ["clicks"],
    cpc: ["clicks", "spend"],
    ctr: ["clicks", "impressions"],
    cpm: ["impressions", "spend"],
    cpp: ["reach", "spend"],
    reach: ["reach"],
    purchase_roas: ["spend", "action_values"],
    ad_name: ["ad_name"],

    conversion_value: ["action_values"],

    purchases: ["actions"],
    add_to_cart: ["actions"],
    initiated_checkouts: ["actions"],
    engagement: ["actions"],
    leads: ["actions"],
    cost_per_lead: ["spend", "actions"],

    cost_per_purchase: ["spend", "actions"],
    cost_per_add_to_cart: ["spend", "actions"],
    conversion_rate: ["clicks", "actions"],
};

export type AvailableAdMetric = keyof typeof AVAILABLE_ADS_METRICS;

export const AVAILABLE_CAMPAIGN_METRICS: Record<string, string[]> = {
    spend: ["spend"],
    impressions: ["impressions"],
    clicks: ["clicks"],
    cpc: ["clicks", "spend"],
    ctr: ["clicks", "impressions"],
    cpm: ["impressions", "spend"],
    cpp: ["reach", "spend"],
    reach: ["reach"],
    purchase_roas: ["spend", "action_values"],

    conversion_value: ["action_values"],

    purchases: ["actions"],
    add_to_cart: ["actions"],
    initiated_checkouts: ["actions"],
    engagement: ["actions"],
    leads: ["actions"],
    cost_per_lead: ["spend", "actions"],

    cost_per_purchase: ["spend", "actions"],
    cost_per_add_to_cart: ["spend", "actions"],
    conversion_rate: ["clicks", "actions"],
};

export type AvailableCampaignMetric = keyof typeof AVAILABLE_CAMPAIGN_METRICS;

export interface AvailableMetrics {
    kpis: AvailableKpiMetric[];
    graphs: AvailableGraphMetric[];
    ads: AvailableAdMetric[];
    campaigns: AvailableCampaignMetric[];
}


// type SchedulingOptionKpiMetric = SchedulingOptionMetric<AvailableKpiMetric>;
// type SchedulingOptionGraphMetric = SchedulingOptionMetric<AvailableGraphMetric>;
// type SchedulingOptionAdMetric = SchedulingOptionMetric<AvailableAdMetric>;
// type SchedulingOptionCampaignMetric =
//     SchedulingOptionMetric<AvailableCampaignMetric>;

export interface SchedulingOptionMetrics {
    kpis?: SectionConfiguration;
    graphs?: SectionConfiguration;
    ads?: SectionConfiguration;
    campaigns?: SectionConfiguration;
}

export interface SectionConfiguration {
    adAccounts: AdAccountConfiguration[];
    order: number
}

export interface AdAccountConfiguration {
    adAccountId: string;
    adAccountName: string;
    provider: 'facebook' | 'tiktok' | 'google';
    order: number;
    metrics: string[];
    customMetrics?: CustomMetric[];
}

export interface ISchedulingOption {
    uuid: string;
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
    reportName?: string;
    providers?: ScheduledProviderConfig[];
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

export interface SchedulingOptionWithImages extends ISchedulingOption {
    images?: ReportImages;
}


export type ScheduleFrequency =
    | "weekly"
    | "biweekly"
    | "monthly"
    | "custom"
    | "cron";

export interface Messages {
    whatsapp: string;
    slack: string;
    email: {
        title: string;
        body: string;
    };
}

export interface Metrics {
    spend?: number;
    impressions?: number;
    clicks?: number;
    cpc?: number;
    ctr?: number;
    cpm?: number;
    cpp?: number;
    reach?: number;
    purchase_roas?: number;
    purchases?: number;
    add_to_cart?: number;
    initiated_checkouts?: number;
    conversion_value?: number;
    cost_per_purchase?: number;
    cost_per_add_to_cart?: number;
    conversion_rate?: number;
    engagement?: number;
}

export interface KPIs extends Metrics {
    leads?: number;
}

export interface Graph extends Metrics {
    date_start: string;
    date_stop: string;
}

export interface Ad extends Metrics {
    adId: string;
    adCreativeId: string;
    thumbnailUrl: string;
    sourceUrl: string;
    ad_name: string;
}

export interface Campaign extends Metrics {
    index: number;
    campaign_name: string;
    leads?: number;
}

export interface SchedulingOptionMetric<T extends string> {
    name: T;
    order: number;
}

export interface Metric {
    name: string;
    value: number;
    order: number;
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
