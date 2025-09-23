export enum PlanInterval {
    MONTHLY = "monthly",
    YEARLY = "yearly",
}

export enum PlanTier {
    FREE = "free",
    STARTER = "starter",
    PROFESSIONAL = "professional",
    ENTERPRISE = "enterprise",
}

export enum SubscriptionStatus {
    TRIALING = "trialing",
    ACTIVE = "active",
    CANCELED = "canceled",
    PAST_DUE = "past_due",
    UNPAID = "unpaid",
    INCOMPLETE = "incomplete",
    INCOMPLETE_EXPIRED = "incomplete_expired",
    PAUSED = "paused",
}

export interface OrgScopedRequest {
    organizationUuid?: string;
}

export interface CreateSubscriptionRequest {
    planId: string;
    paymentMethodId?: string;
    trialDays?: number;
}

export interface UpdateSubscriptionRequest {
    planId: string;
    prorationBehavior?: "create_prorations" | "none";
}

export interface CancelSubscriptionRequest {
    immediately?: boolean;
}
export interface StripeWebhookInput {
    rawBody: Buffer;
    signature: string;
}

export interface CheckLimitsRequest {
    limitType: "reports" | "clients" | "members";
    clientId?: string;
}

export interface FeatureAccessRequest {
    feature: "publishedLinks" | "loomIntegration" | "aiDescription" | "marklyBadge";
}