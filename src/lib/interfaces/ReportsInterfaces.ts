import type { FACEBOOK_DATE_PRESETS } from "../enums/enums.js";

export type ScheduleFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "custom"
  | "cron";

interface BaseSchedule {
  frequency: string;
  clientUuid: string;
  reportName?: string;
  reviewNeeded: boolean;
  datePreset: FACEBOOK_DATE_PRESETS;
  organizationUuid: string;
  metrics: SchedulingOptionMetrics;
  messages: {
    whatsapp: string;
    slack: string;
    email: {
      title: string;
      body: string;
    };
  };
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
  reviewNeeded: boolean;
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
  reviewNeeded: boolean;
  accountId: string;
  datePreset: FACEBOOK_DATE_PRESETS;
  timeZone: string;
  metrics: SchedulingOptionMetrics;
  messages: {
    whatsapp: string;
    slack: string;
    email: {
      title: string;
      body: string;
    };
  };
}


export interface ReportData {
  ads: Ad[];
  KPIs: KPIs | null;
  campaigns: Campaign[];
  graphs: Graph[];
}

export interface KPIs {
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

export interface Graph {
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
  date_start: string;
  date_stop: string;
}

export interface Ad {
  adId: string;
  adCreativeId: string;
  thumbnailUrl: string;
  sourceUrl: string;

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

export interface Campaign {
  index: number;
  campaign_name: string;

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

export const AVAILABLE_KPI_METRICS: Record<string, string[]> = {
  spend: ['spend'],
  impressions: ['impressions'],
  clicks: ['clicks'],
  cpc: ['cpc'],
  ctr: ['ctr'],
  cpm: ['cpm'],
  cpp: ['cpp'],
  reach: ['reach'],
  purchase_roas: ['purchase_roas'],

  conversion_value: ['action_values'],

  purchases: ['actions'],
  add_to_cart: ['actions'],
  initiated_checkouts: ['actions'],
  engagement: ['actions'],

  cost_per_purchase: ['spend', 'actions'],
  cost_per_add_to_cart: ['spend', 'actions'],
  conversion_rate: ['clicks', 'actions'],
}

export type AvailableKpiMetric = keyof typeof AVAILABLE_KPI_METRICS;

export const AVAILABLE_GRAPH_METRICS: Record<string, string[]> = {
  spend: ['spend'],
  impressions: ['impressions'],
  clicks: ['clicks'],
  cpc: ['cpc'],
  ctr: ['ctr'],
  cpm: ['cpm'],
  cpp: ['cpp'],
  reach: ['reach'],
  purchase_roas: ['purchase_roas'],

  conversion_value: ['action_values'],

  purchases: ['actions'],
  add_to_cart: ['actions'],
  initiated_checkouts: ['actions'],
  engagement: ['actions'],

  cost_per_purchase: ['spend', 'actions'],
  cost_per_add_to_cart: ['spend', 'actions'],
  conversion_rate: ['clicks', 'actions']
}

export type AvailableGraphMetric = keyof typeof AVAILABLE_GRAPH_METRICS;

export const AVAILABLE_ADS_METRICS: Record<string, string[]> = {
  spend: ['spend'],
  impressions: ['impressions'],
  clicks: ['clicks'],
  cpc: ['cpc'],
  ctr: ['ctr'],
  cpm: ['cpm'],
  cpp: ['cpp'],
  reach: ['reach'],
  purchase_roas: ['purchase_roas'],

  conversion_value: ['action_values'],

  purchases: ['actions'],
  add_to_cart: ['actions'],
  initiated_checkouts: ['actions'],
  engagement: ['actions'],

  cost_per_purchase: ['spend', 'actions'],
  cost_per_add_to_cart: ['spend', 'actions'],
  conversion_rate: ['clicks', 'actions']
}

export type AvailableAdMetric = keyof typeof AVAILABLE_ADS_METRICS;

export const AVAILABLE_CAMPAIGN_METRICS: Record<string, string[]> = {
  spend: ['spend'],
  impressions: ['impressions'],
  clicks: ['clicks'],
  cpc: ['cpc'],
  ctr: ['ctr'],
  cpm: ['cpm'],
  cpp: ['cpp'],
  reach: ['reach'],
  purchase_roas: ['purchase_roas'],

  conversion_value: ['action_values'],

  purchases: ['actions'],
  add_to_cart: ['actions'],
  initiated_checkouts: ['actions'],
  engagement: ['actions'],

  cost_per_purchase: ['spend', 'actions'],
  cost_per_add_to_cart: ['spend', 'actions'],
  conversion_rate: ['clicks', 'actions']
}

export type AvailableCampaignMetric = keyof typeof AVAILABLE_CAMPAIGN_METRICS;

export interface AvailableMetrics {
  kpis: AvailableKpiMetric[];
  graphs: AvailableGraphMetric[];
  ads: AvailableAdMetric[];
  campaigns: AvailableCampaignMetric[];
}

export interface SchedulingOptionKpiMetric {
  name: AvailableKpiMetric;
  order: number;
}

export interface SchedulingOptionGraphMetric {
  name: AvailableGraphMetric;
  order: number;
}

export interface SchedulingOptionAdMetric {
  name: AvailableAdMetric;
  order: number;
}

export interface SchedulingOptionCampaignMetric {
  name: AvailableCampaignMetric;
  order: number;
}

export interface SchedulingOptionMetrics {
  kpis: {
    order: number;
    metrics: SchedulingOptionKpiMetric[];
  }
  graphs: {
    order: number;
    metrics: SchedulingOptionGraphMetric[];
  }
  ads: {
    order: number;
    metrics: SchedulingOptionAdMetric[];
  }
  campaigns: {
    order: number;
    metrics: SchedulingOptionCampaignMetric[];
  }
}

export interface SendAfterReviewRequest {
  reportUuid: string
}


