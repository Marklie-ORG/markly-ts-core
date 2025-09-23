import type {Context, Next} from "koa";
import {User} from "../entities/User.js";
import {Database} from "../db/config/DB.js";
import {Organization} from "../entities/Organization.js";
import {StripeService} from "../services/StripeService.js";
import {SubscriptionActivityLogger} from "../classes/SubscriptionActivityLogger.js";

const subscriptionService = new StripeService();
await subscriptionService.initialize();

const activityLogger = new SubscriptionActivityLogger();
await activityLogger.initialize();

export const SubscriptionMiddleware = (
    limitType: 'reports' | 'clients' | 'members',
    clientId?: string
) => {
    return async (ctx: Context, next: Next) => {
        const user = ctx.state.user as User;

        if (!user || !user.activeOrganization) {
            ctx.status = 401;
            ctx.body = { message: "No active organization selected" };
            return;
        }

        const database = await Database.getInstance();
        const organization = await database.em.findOne(Organization, {
            uuid: user.activeOrganization.uuid
        });

        if (!organization) {
            ctx.status = 404;
            ctx.body = { message: "Organization not found" };
            return;
        }

        // @ts-ignore
        const actualClientId = clientId || ctx.request.body.clientUuid || ctx.params?.clientUuid;

        const limitCheck = await subscriptionService.checkSubscriptionLimits(
            organization,
            limitType,
            limitType === 'reports' ? actualClientId : undefined
        );

        await activityLogger.logUsageLimitEvent(
            organization,
            user,
            limitType,
            limitCheck.currentUsage || 0,
            limitCheck.limit || 0,
            limitCheck.allowed,
            ctx
        );

        if (!limitCheck.allowed) {
            ctx.status = 402;
            ctx.body = {
                message: limitCheck.reason,
                currentUsage: limitCheck.currentUsage,
                limit: limitCheck.limit,
                upgradeRequired: true
            };
            return;
        }

        ctx.state.subscriptionLimits = limitCheck;
        ctx.state.reportClientId = actualClientId;

        await next();

        if (limitType === 'reports' && actualClientId && ctx.status >= 200 && ctx.status < 300) {
            await subscriptionService.recordReportUsage(
                organization,
                actualClientId,
                user,
                undefined,
                ctx
            );
        }
    };
};

type PremiumFeature =
    | 'publishedLinks'
    | 'loomIntegration'
    | 'aiDescription'
    | 'marklyBadge';

export const FeatureAccessMiddleware = (
    requiredFeature: PremiumFeature
) => {
    return async (ctx: Context, next: Next) => {
        const user = ctx.state.user as User;

        if (!user || !user.activeOrganization) {
            ctx.status = 401;
            ctx.body = { message: "No active organization selected" };
            return;
        }

        const database = await Database.getInstance();
        const organization = await database.em.findOne(Organization, {
            uuid: user.activeOrganization.uuid
        });

        if (!organization) {
            ctx.status = 404;
            ctx.body = { message: "Organization not found" };
            return;
        }

        const featureCheck = await subscriptionService.checkFeatureAccess(
            organization,
            requiredFeature
        );

        await activityLogger.logFeatureAccess(
            organization,
            user,
            requiredFeature,
            featureCheck.allowed,
            featureCheck.requiredPlan,
            ctx
        );

        if (!featureCheck.allowed) {
            ctx.status = 403;
            ctx.body = {
                message: `This feature requires ${featureCheck.requiredPlan}`,
                requiredFeature,
                requiredPlan: featureCheck.requiredPlan,
                upgradeRequired: true
            };
            return;
        }

        await next();
    };
};
