import type { CustomFormulaFormat, FACEBOOK_DATE_PRESETS } from "../enums/enums.js";
import type { OrganizationClient } from "../entities/OrganizationClient.js";
import type {SchedulingOption} from "../entities/SchedulingOption.js";
import type { Organization } from "lib/entities/Organization.js";
import type {
  Ad,
  AvailableAdMetric,
  AvailableCampaignMetric,
  AvailableGraphMetric,
  AvailableKpiMetric, Campaign, Colors, Graph,
  KPIs,
  Messages, Metric,
  SchedulingOptionMetric,
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
  data: ReportData[];
  messages: Messages;
  images?: ReportImages;
  reportName?: string;
  pdfFilename?: string;
  colors?: Colors;
}

export interface ReportData {
  provider: 'facebook' | 'tiktok' | 'google';
  sections: ReportDataSection[];
}

export interface ReportDataSection {
  name: 'kpis' | 'graphs' | 'ads' | 'campaigns';
  order: number;
  adAccounts: ReportDataSectionAdAccount[];
}

export interface ReportDataSectionAdAccount {
  adAccountId: string;
  order: number;
  adAccountName: string
  data: Metric[] | ReportDataAd[] | ReportDataCampaign[] | ReportDataGraph[]
  currency: string
}

export interface ReportDataAd {
  adId: string;
  adCreativeId: string;
  thumbnailUrl: string;
  sourceUrl: string;
  data: Metric[]
  ad_name: string;

}

export interface ReportDataCampaign {
  index: number;
  campaign_name: string;
  data: Metric[]
}


export interface ReportDataGraph {
  data: Metric[]
  date_start: string;
  date_stop: string;
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

export interface CustomFormula {
  uuid: string;
  name: string;
  order: number;
}

export interface ExtendedCustomFormula extends CustomFormula {
  formula: string;
  format: CustomFormulaFormat;
  description: string;
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

export interface UpdateReportMetadataRequest {
  reportName?: string
  images?: {
    clientLogoGsUri: string
    organizationLogoGsUri: string
  }
  messages?: Messages
  colors?: Colors
}