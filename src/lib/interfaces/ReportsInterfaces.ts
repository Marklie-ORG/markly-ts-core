import type {Colors, Messages} from "./SchedulesInterfaces.js";
import type {CustomFormula} from "./CustomFormulasInterfaces.js";

/**
 * Base metric configuration used for both scheduling and runtime
 */
export interface MetricConfig {
  name: string;
  order: number;
  enabled?: boolean;
}

/**
 * Custom metric extends base with ID for Facebook custom conversions
 */
export interface CustomMetricConfig extends MetricConfig {
  id: string;
}

export interface SendAfterReviewRequest {
  reportUuid: string;
  sendAt?: string;
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


export type SectionType = 'kpis' | 'graphs' | 'ads' | 'campaigns';


export interface SectionConfig {
  name: SectionType;
  enabled: boolean;
  order: number;
  adAccounts: AdAccountConfig[];
}

export interface ReportJobData {
  scheduleUuid: string;
}


export interface AdAccountConfig {
  adAccountId: string;
  adAccountName?: string;
  enabled: boolean;
  order: number;
  currency?: string;
  metrics: MetricConfig[];
  customMetrics?: CustomMetricConfig[];
  customFormulas?: CustomFormula[];
  adsSettings?: {
    maxAds?: number;
    sortBy?: string;
  };
  campaignsSettings?: {
    maxCampaigns?: number;
    sortBy?: string;
  };
}


export interface ProviderConfig {
  provider: 'facebook' | 'tiktok' | 'google';
  sections: SectionConfig[];
}

export interface GenerateReportRequest {
  scheduleUuid: string;
}