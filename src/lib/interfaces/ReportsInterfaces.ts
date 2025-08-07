import type { FACEBOOK_DATE_PRESETS } from "../enums/enums.js";
import type { OrganizationClient } from "../entities/OrganizationClient.js";
import type {SchedulingOption} from "../entities/SchedulingOption.js";
import type { Organization } from "lib/entities/Organization.js";
import type {
  Ad,
  AvailableAdMetric,
  AvailableCampaignMetric,
  AvailableGraphMetric,
  AvailableKpiMetric, Campaign, Graph, KPIs, Messages, ScheduledProviderConfig, SchedulingOptionMetric
} from "./SchedulesInterfaces.js";

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

export interface AdAccountMetricConfig {
  adAccountId: string;
  kpis: AdAccountMetricGroup<AvailableKpiMetric>;
  graphs: AdAccountMetricGroup<AvailableGraphMetric>;
  ads: AdAccountMetricGroup<AvailableAdMetric>;
  campaigns: AdAccountMetricGroup<AvailableCampaignMetric>;
  customMetrics?: CustomMetric[];
}

interface AdAccountMetricGroup<T extends string> {
  order: number;
  metrics: SchedulingOptionMetric<T>[];
}

export interface ReportJobData {
  clientUuid: string;
  organizationUuid: string;
  scheduleUuid: string;
  reviewRequired: boolean;
  datePreset: FACEBOOK_DATE_PRESETS;
  timeZone: string;
  data: ScheduledProviderConfig[];
  messages: Messages;
  images?: ReportImages;
  reportName?: string;
}

export interface SendAfterReviewRequest {
  reportUuid: string;
  sendAt?: string;
}

export interface ReportWithImages extends IReport {
  images?: ReportImages;
}

export interface ReportImages {
  clientLogo: string;
  organizationLogo: string;
}

export interface CustomMetric {
  id: string;
  name: string;
  order: number;
}

export interface ScheduleBulkActionRequest {
  uuids: string[];
}

export interface MetricWithValue {
  name: string;
  value: number | null;
}

export interface RuntimeAdAccountData {
  adAccountId: string;
  adAccountName: string;
  kpis: KPIs;
  ads: Ad[];
  graphs: Graph[];
  campaigns: Campaign[];
}

export interface ProvidersData {
  name: 'facebook' | 'tiktok' | 'google';
  sections: RuntimeAdAccountData[];
}
