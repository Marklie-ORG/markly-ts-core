import { Database } from '../db/config/DB.js';
import { ActivityLog } from '../entities/ActivityLog.js';
import { User } from '../entities/User.js';
import { Organization } from '../entities/Organization.js';
import { OrganizationClient } from '../entities/OrganizationClient.js';
import type { Context } from 'koa';
import {Log} from "./Logger.js";
import type {OrganizationSubscription} from "../entities/subscription/OrganizationSubscription.js";
import type {SubscriptionPlan} from "../entities/subscription/SubscriptionPlan.js";

const logger = Log.getInstance().extend('subscription-activity');

export const SubscriptionActions = {
    SUBSCRIPTION_CREATED: 'subscription.created',
    SUBSCRIPTION_UPDATED: 'subscription.updated',
    SUBSCRIPTION_UPGRADED: 'subscription.upgraded',
    SUBSCRIPTION_DOWNGRADED: 'subscription.downgraded',
    SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
    SUBSCRIPTION_RESUMED: 'subscription.resumed',
    SUBSCRIPTION_EXPIRED: 'subscription.expired',

    TRIAL_STARTED: 'trial.started',
    TRIAL_ENDED: 'trial.ended',
    TRIAL_CONVERTED: 'trial.converted',
    TRIAL_EXTENDED: 'trial.extended',
    TRIAL_REPORT_SENT: 'trial.report_sent',

    PAYMENT_SUCCEEDED: 'payment.succeeded',
    PAYMENT_FAILED: 'payment.failed',
    PAYMENT_METHOD_ADDED: 'payment_method.added',
    PAYMENT_METHOD_REMOVED: 'payment_method.removed',
    PAYMENT_METHOD_UPDATED: 'payment_method.updated',
    INVOICE_PAID: 'invoice.paid',
    REFUND_PROCESSED: 'refund.processed',

    REPORT_SENT: 'report.sent',
    CLIENT_ADDED: 'client.added',
    CLIENT_REMOVED: 'client.removed',
    MEMBER_INVITED: 'member.invited',
    MEMBER_JOINED: 'member.joined',
    MEMBER_REMOVED: 'member.removed',

    LIMIT_WARNING: 'limit.warning',
    LIMIT_REACHED: 'limit.reached',
    LIMIT_EXCEEDED_ATTEMPT: 'limit.exceeded_attempt',

    FEATURE_ACCESSED: 'feature.accessed',
    FEATURE_DENIED: 'feature.denied',

    ADMIN_PLAN_OVERRIDE: 'admin.plan_override',
    ADMIN_TRIAL_EXTENSION: 'admin.trial_extension',
    ADMIN_SUBSCRIPTION_SYNC: 'admin.subscription_sync'
};

export class SubscriptionActivityLogger {
    private database!: Database;

    async initialize() {
        this.database = await Database.getInstance();
    }

    private async createActivity(
        action: string,
        organization?: Organization,
        user?: User,
        client?: OrganizationClient,
        metadata?: Record<string, any>,
        targetType?: string,
        targetUuid?: string,
        actor: 'user' | 'system' = 'user'
    ): Promise<ActivityLog> {
        const activity = new ActivityLog();
        activity.action = action;
        if (organization) activity.organization = organization;
        if (user) activity.user = user;
        if (client) activity.client = client;
        if (metadata) activity.metadata = metadata;
        if (targetType !== undefined) activity.targetType = targetType;
        if (targetUuid !== undefined) activity.targetUuid = targetUuid;
        activity.actor = actor;

        await this.database.em.persist(activity).flush();
        return activity;
    }

    async logSubscriptionCreated(
        organization: Organization,
        subscription: OrganizationSubscription,
        plan: SubscriptionPlan,
        user?: User,
        ctx?: Context
    ): Promise<void> {
        await this.createActivity(
            SubscriptionActions.SUBSCRIPTION_CREATED,
            organization,
            user,
            undefined,
            {
                planId: plan.uuid,
                planName: plan.name,
                planTier: plan.tier,
                price: plan.price,
                interval: plan.interval,
                stripeSubscriptionId: subscription.stripeSubscriptionId,
                trialEnd: subscription.trialEnd,
                ipAddress: ctx?.ip,
                userAgent: ctx?.headers['user-agent']
            },
            'OrganizationSubscription',
            subscription.uuid
        );

        logger.info(`Logged subscription creation for org ${organization.uuid}`);
    }

    async logSubscriptionUpdated(
        organization: Organization,
        subscription: OrganizationSubscription,
        oldPlan: SubscriptionPlan,
        newPlan: SubscriptionPlan,
        user?: User,
        ctx?: Context
    ): Promise<void> {
        const isUpgrade = newPlan.price > oldPlan.price;

        await this.createActivity(
            isUpgrade ? SubscriptionActions.SUBSCRIPTION_UPGRADED : SubscriptionActions.SUBSCRIPTION_DOWNGRADED,
            organization,
            user,
            undefined,
            {
                oldPlanId: oldPlan.uuid,
                oldPlanName: oldPlan.name,
                oldPlanPrice: oldPlan.price,
                newPlanId: newPlan.uuid,
                newPlanName: newPlan.name,
                newPlanPrice: newPlan.price,
                priceDifference: newPlan.price - oldPlan.price,
                ipAddress: ctx?.ip
            },
            'OrganizationSubscription',
            subscription.uuid
        );
    }

    async logPaymentSuccess(
        organization: Organization,
        amount: number,
        invoiceId: string,
        subscriptionId: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        await this.createActivity(
            SubscriptionActions.PAYMENT_SUCCEEDED,
            organization,
            undefined,
            undefined,
            {
                amount,
                currency: 'USD',
                invoiceId,
                subscriptionId,
                ...metadata
            },
            'Payment',
            invoiceId,
            'system'
        );
    }

    async logPaymentFailure(
        organization: Organization,
        amount: number,
        invoiceId: string,
        reason: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        await this.createActivity(
            SubscriptionActions.PAYMENT_FAILED,
            organization,
            undefined,
            undefined,
            {
                amount,
                currency: 'USD',
                invoiceId,
                failureReason: reason,
                ...metadata
            },
            'Payment',
            invoiceId,
            'system'
        );

        logger.warn(`Payment failed for org ${organization.uuid}: ${reason}`);
    }

    async logFreeTrialUsage(
        organization: Organization,
        user: User,
        client: OrganizationClient,
        reportsUsed: number,
        reportsLimit: number,
        ctx?: Context
    ): Promise<void> {
        await this.createActivity(
            SubscriptionActions.TRIAL_REPORT_SENT,
            organization,
            user,
            client,
            {
                reportsUsed,
                reportsLimit,
                remainingReports: Math.max(0, reportsLimit - reportsUsed),
                clientId: client.uuid,
                clientName: client.name,
                ipAddress: ctx?.ip
            },
            'FreeTrialUsage',
            organization.uuid
        );
    }

    async logUsageLimitEvent(
        organization: Organization,
        user: User,
        limitType: string,
        currentUsage: number,
        limit: number,
        allowed: boolean,
        ctx?: Context
    ): Promise<void> {
        const percentUsed = Math.round((currentUsage / limit) * 100);
        let action: string;

        if (!allowed) {
            action = SubscriptionActions.LIMIT_EXCEEDED_ATTEMPT;
        } else if (percentUsed >= 100) {
            action = SubscriptionActions.LIMIT_REACHED;
        } else if (percentUsed >= 80) {
            action = SubscriptionActions.LIMIT_WARNING;
        } else {
            return;
        }

        await this.createActivity(
            action,
            organization,
            user,
            undefined,
            {
                limitType,
                currentUsage,
                limit,
                percentUsed,
                allowed,
                ipAddress: ctx?.ip
            }
        );
    }

    async logFeatureAccess(
        organization: Organization,
        user: User,
        feature: string,
        allowed: boolean,
        requiredPlan?: string,
        ctx?: Context
    ): Promise<void> {
        await this.createActivity(
            allowed ? SubscriptionActions.FEATURE_ACCESSED : SubscriptionActions.FEATURE_DENIED,
            organization,
            user,
            undefined,
            {
                feature,
                allowed,
                requiredPlan,
                ipAddress: ctx?.ip
            }
        );
    }

    async logTrialStarted(
        organization: Organization,
        trialDays: number,
        maxReportsPerClient: number,
        maxTotalReports: number
    ): Promise<void> {
        await this.createActivity(
            SubscriptionActions.TRIAL_STARTED,
            organization,
            undefined,
            undefined,
            {
                trialDays,
                maxReportsPerClient,
                maxTotalReports,
                trialEndDate: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
            },
            'FreeTrialUsage',
            organization.uuid,
            'system'
        );
    }

    async logTrialConverted(
        organization: Organization,
        user: User,
        planName: string,
        reportsUsed: number
    ): Promise<void> {
        await this.createActivity(
            SubscriptionActions.TRIAL_CONVERTED,
            organization,
            user,
            undefined,
            {
                planName,
                reportsUsedDuringTrial: reportsUsed
            },
            'FreeTrialUsage',
            organization.uuid
        );
    }

    async logAdminAction(
        adminUser: User,
        targetOrganization: Organization,
        action: 'plan_override' | 'trial_extension' | 'subscription_sync',
        details: Record<string, any>
    ): Promise<void> {
        const actionMap = {
            'plan_override': SubscriptionActions.ADMIN_PLAN_OVERRIDE,
            'trial_extension': SubscriptionActions.ADMIN_TRIAL_EXTENSION,
            'subscription_sync': SubscriptionActions.ADMIN_SUBSCRIPTION_SYNC
        };

        await this.createActivity(
            actionMap[action],
            targetOrganization,
            adminUser,
            undefined,
            {
                adminUserId: adminUser.uuid,
                adminEmail: adminUser.email,
                action,
                ...details
            },
            'Organization',
            targetOrganization.uuid
        );

        logger.info(`Admin action logged: ${action} by ${adminUser.email} for org ${targetOrganization.uuid}`);
    }

    async getPaymentHistory(
        organization: Organization,
        startDate?: Date,
        endDate?: Date
    ): Promise<ActivityLog[]> {
        const query: any = {
            organization,
            action: {
                $in: [
                    SubscriptionActions.PAYMENT_SUCCEEDED,
                    SubscriptionActions.PAYMENT_FAILED,
                    SubscriptionActions.REFUND_PROCESSED
                ]
            }
        };

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = startDate;
            if (endDate) query.createdAt.$lte = endDate;
        }

        return await this.database.em.find(ActivityLog, query, {
            orderBy: { createdAt: 'DESC' }
        });
    }

    async getSubscriptionTimeline(organization: Organization): Promise<ActivityLog[]> {
        return await this.database.em.find(ActivityLog, {
            organization,
            action: {
                $in: [
                    SubscriptionActions.SUBSCRIPTION_CREATED,
                    SubscriptionActions.SUBSCRIPTION_UPGRADED,
                    SubscriptionActions.SUBSCRIPTION_DOWNGRADED,
                    SubscriptionActions.SUBSCRIPTION_CANCELLED,
                    SubscriptionActions.SUBSCRIPTION_RESUMED,
                    SubscriptionActions.SUBSCRIPTION_EXPIRED,
                    SubscriptionActions.TRIAL_STARTED,
                    SubscriptionActions.TRIAL_CONVERTED
                ]
            }
        }, {
            orderBy: { createdAt: 'DESC' }
        });
    }

    async getTrialUsageHistory(organization: Organization): Promise<ActivityLog[]> {
        return await this.database.em.find(ActivityLog, {
            organization,
            action: SubscriptionActions.TRIAL_REPORT_SENT
        }, {
            populate: ['client', 'user'],
            orderBy: { createdAt: 'DESC' }
        });
    }
}