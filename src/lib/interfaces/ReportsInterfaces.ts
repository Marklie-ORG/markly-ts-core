import type { FACEBOOK_DATE_PRESETS } from "../enums/enums.js";
import type { Report } from "../entities/Report.js";
import type { ScheduledJob } from "../entities/ScheduledJob.js";
import type { OrganizationClient } from "../entities/OrganizationClient.js";
import type {SchedulingOption} from "../entities/SchedulingOption.js";
import type { Organization } from "lib/entities/Organization.js";

export interface ISchedulingOption {
  uuid: string;
  createdAt: Date;
  updatedAt: Date;
  cronExpression: string;
  datePreset: FACEBOOK_DATE_PRESETS;
  isActive: boolean;
  reportName?: string;
  platform: string;
  jobData?: Record<string, any>;
  timezone?: string;
  reviewNeeded: boolean;
  lastRun?: Date;
  nextRun?: Date;
  reports?: Report[];
  scheduledJob?: ScheduledJob;
  client: OrganizationClient;
}



export interface IReport {
  organization: Organization;
  client: OrganizationClient;
  reportType: string;
  reviewRequired: boolean;
  reviewedAt?: Date;
  gcsUrl: string;
  schedulingOption?: SchedulingOption;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export type SchedulingOptionWithExtras = Omit<SchedulingOption, 'nextRun' | 'lastRun'> & {
  nextRun: string;
  lastRun: string;
  frequency: string;
  images?: ReportImages;
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

interface BaseSchedule {
  frequency: string;
  clientUuid: string;
  reportName: string;
  reviewRequired: boolean;
  datePreset: FACEBOOK_DATE_PRESETS;
  organizationUuid: string;
  metrics: SchedulingOptionMetrics;
  messages: Messages;
  images?: ReportImages;
}

interface TimeBasedSchedule extends BaseSchedule {
  time: string;
  timeZone: string;
}

interface ScheduleModifiers {
  startDate?: string;
  conditions?: string;
}

interface WeekdaySchedule extends TimeBasedSchedule {
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

export interface MonthlySchedule extends TimeBasedSchedule {
  frequency: "monthly";
  dayOfMonth: number;
}

export interface CustomSchedule extends TimeBasedSchedule, ScheduleModifiers {
  frequency: "custom";
  intervalDays: number;
}

export interface CronSchedule extends ScheduleModifiers, TimeBasedSchedule {
  frequency: "cron";
  cronExpression: string;
  clientUuid: string;
  reviewRequired: boolean;
  datePreset: FACEBOOK_DATE_PRESETS;
  organizationUuid: string;
}

export type ReportScheduleRequest =
  | WeeklySchedule
  | BiweeklySchedule
  | MonthlySchedule
  | CustomSchedule
  | CronSchedule;

export interface ReportJobData {
  clientUuid: string;
  organizationUuid: string;
  scheduleUuid: string;
  reviewRequired: boolean;
  datePreset: FACEBOOK_DATE_PRESETS;
  timeZone: string;
  metrics: SchedulingOptionMetrics;
  messages: Messages;
  images?: ReportImages;
}

export interface ReportData {
  ads: Ad[];
  KPIs: KPIs | null;
  campaigns: Campaign[];
  graphs: Graph[];
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
}

export interface Campaign extends Metrics {
  index: number;
  campaign_name: string;
  leads?: number;
}

export const AVAILABLE_KPI_METRICS: Record<string, string[]> = {
  spend: ["spend"],
  impressions: ["impressions"],
  clicks: ["clicks"],
  cpc: ["cpc"],
  ctr: ["ctr"],
  cpm: ["cpm"],
  cpp: ["cpp"],
  reach: ["reach"],
  purchase_roas: ["purchase_roas"],

  conversion_value: ["action_values"],

  purchases: ["actions"],
  add_to_cart: ["actions"],
  initiated_checkouts: ["actions"],
  engagement: ["actions"],
  leads: ["actions"],
  cost_per_lead: ["actions"],

  cost_per_purchase: ["spend", "actions"],
  cost_per_add_to_cart: ["spend", "actions"],
  conversion_rate: ["clicks", "actions"],
};

export type AvailableKpiMetric = keyof typeof AVAILABLE_KPI_METRICS;

export const AVAILABLE_GRAPH_METRICS: Record<string, string[]> = {
  spend: ["spend"],
  impressions: ["impressions"],
  clicks: ["clicks"],
  cpc: ["cpc"],
  ctr: ["ctr"],
  cpm: ["cpm"],
  cpp: ["cpp"],
  reach: ["reach"],
  purchase_roas: ["purchase_roas"],

  conversion_value: ["action_values"],

  purchases: ["actions"],
  add_to_cart: ["actions"],
  initiated_checkouts: ["actions"],
  engagement: ["actions"],
  leads: ["actions"],
  cost_per_lead: ["actions"],

  cost_per_purchase: ["spend", "actions"],
  cost_per_add_to_cart: ["spend", "actions"],
  conversion_rate: ["clicks", "actions"],
};

export type AvailableGraphMetric = keyof typeof AVAILABLE_GRAPH_METRICS;

export const AVAILABLE_ADS_METRICS: Record<string, string[]> = {
  spend: ["spend"],
  impressions: ["impressions"],
  clicks: ["clicks"],
  cpc: ["cpc"],
  ctr: ["ctr"],
  cpm: ["cpm"],
  cpp: ["cpp"],
  reach: ["reach"],
  purchase_roas: ["purchase_roas"],

  conversion_value: ["action_values"],

  purchases: ["actions"],
  add_to_cart: ["actions"],
  initiated_checkouts: ["actions"],
  engagement: ["actions"],
  leads: ["actions"],
  cost_per_lead: ["actions"],

  cost_per_purchase: ["spend", "actions"],
  cost_per_add_to_cart: ["spend", "actions"],
  conversion_rate: ["clicks", "actions"],
};

export type AvailableAdMetric = keyof typeof AVAILABLE_ADS_METRICS;

export const AVAILABLE_CAMPAIGN_METRICS: Record<string, string[]> = {
  spend: ["spend"],
  impressions: ["impressions"],
  clicks: ["clicks"],
  cpc: ["cpc"],
  ctr: ["ctr"],
  cpm: ["cpm"],
  cpp: ["cpp"],
  reach: ["reach"],
  purchase_roas: ["purchase_roas"],

  conversion_value: ["action_values"],

  purchases: ["actions"],
  add_to_cart: ["actions"],
  initiated_checkouts: ["actions"],
  engagement: ["actions"],
  leads: ["actions"],
  cost_per_lead: ["actions"],

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

export interface SchedulingOptionMetric<T extends string> {
  name: T;
  order: number;
}

type SchedulingOptionKpiMetric = SchedulingOptionMetric<AvailableKpiMetric>;
type SchedulingOptionGraphMetric = SchedulingOptionMetric<AvailableGraphMetric>;
type SchedulingOptionAdMetric = SchedulingOptionMetric<AvailableAdMetric>;
type SchedulingOptionCampaignMetric =
  SchedulingOptionMetric<AvailableCampaignMetric>;

export interface SchedulingOptionMetrics {
  kpis: {
    order: number;
    metrics: SchedulingOptionKpiMetric[];
  };
  graphs: {
    order: number;
    metrics: SchedulingOptionGraphMetric[];
  };
  ads: {
    order: number;
    metrics: SchedulingOptionAdMetric[];
  };
  campaigns: {
    order: number;
    metrics: SchedulingOptionCampaignMetric[];
  };
}

export interface SendAfterReviewRequest {
  reportUuid: string;
}

export interface ReportWithImages extends IReport {
  images?: ReportImages;
}

export interface ReportImages {
  clientLogo: string;
  organizationLogo: string;
}