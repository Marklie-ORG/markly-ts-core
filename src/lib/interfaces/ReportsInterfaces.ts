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

/**
 * Section types in reports
 */
export type SectionType = 'kpis' | 'graphs' | 'ads' | 'campaigns';

/**
 * Configuration for a report section (used in scheduling)
 */
export interface SectionConfig {
  key: SectionType;
  enabled: boolean;
  order: number;
  adAccounts: AdAccountConfig[];
}

export interface ReportJobData {
  scheduleUuid: string;
}

/**
 * Configuration for an ad account within a section
 */
export interface AdAccountConfig {
  adAccountId: string;
  adAccountName?: string;
  enabled: boolean;
  order: number;
  currency?: string;
  metrics: MetricConfig[];
  customMetrics?: CustomMetricConfig[];
  customFormulas?: CustomFormula[];
  settings?: {
    maxItems?: number;
    sortBy?: string;
  };
}

/**
 * Provider configuration (Facebook, TikTok, Google)
 */
export interface ProviderConfig {
  provider: 'facebook' | 'tiktok' | 'google';
  sections: SectionConfig[];
}

export interface GenerateReportRequest {
  scheduleUuid: string;
}