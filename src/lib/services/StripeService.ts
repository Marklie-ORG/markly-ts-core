import Stripe from 'stripe';
import { Database } from '../db/config/DB.js';
import { User } from '../entities/User.js';
import { Log } from '../classes/Logger.js';
import { OrganizationClient } from '../entities/OrganizationClient.js';
import { OrganizationMember } from '../entities/OrganizationMember.js';
import type { Context } from 'koa';
import { FreeTrialUsage } from 'lib/entities/subscription/FreeTrialUsage.js';
import { SubscriptionActivityLogger } from 'lib/classes/SubscriptionActivityLogger.js';
import type { Organization } from 'lib/entities/Organization.js';
import {SubscriptionPlan} from "../entities/subscription/SubscriptionPlan.js";
import {OrganizationSubscription} from "../entities/subscription/OrganizationSubscription.js";
import {SubscriptionStatus} from "../interfaces/SubscriptionInterfaces.js";
import {PaymentMethod} from "../entities/subscription/PaymentMethod.js";
import {UsageRecord, UsageType} from "../entities/subscription/UsageRecord.js";

const logger = Log.getInstance().extend('subscription-service');

export class StripeService {
    private stripe: Stripe;
    private database!: Database;
    private activityLogger: SubscriptionActivityLogger;

    constructor() {
        this.stripe = new Stripe(process.env.STRIPE_KEY!);
        this.activityLogger = new SubscriptionActivityLogger();
    }

    async initialize() {
        this.database = await Database.getInstance();
        await this.activityLogger.initialize();
    }

    // Initialize free trial for new organization
    async initializeFreeTrialForOrganization(organization: Organization): Promise<FreeTrialUsage> {
        const freeTrialUsage = new FreeTrialUsage();
        freeTrialUsage.organization = organization;
        freeTrialUsage.trialDurationDays = 15;
        freeTrialUsage.maxReportsPerClient = 2;
        freeTrialUsage.maxTotalReports = 8;
        freeTrialUsage.trialEndDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

        await this.database.em.persist(freeTrialUsage).flush();

        // Log trial start
        await this.activityLogger.logTrialStarted(
            organization,
            15,
            freeTrialUsage.maxReportsPerClient,
            freeTrialUsage.maxTotalReports
        );

        return freeTrialUsage;
    }

    // Check if organization can perform action based on subscription or trial
    async checkSubscriptionLimits(
        organization: Organization,
        limitType: 'reports' | 'clients' | 'members',
        clientId?: string
    ): Promise<{ allowed: boolean; reason?: string; currentUsage?: number; limit?: number }> {
        const activeSubscription = await this.getActiveSubscription(organization);

        if (!activeSubscription) {
            // Check free trial
            const freeTrialUsage = await this.database.em.findOne(FreeTrialUsage, { organization });

            if (!freeTrialUsage) {
                return { allowed: false, reason: 'No active subscription or free trial' };
            }

            // Check if trial has expired
            if (new Date() > freeTrialUsage.trialEndDate) {
                return { allowed: false, reason: 'Free trial has expired' };
            }

            if (limitType === 'reports' && clientId) {
                const canSend = freeTrialUsage.canSendReportForClient(clientId);
                const clientReports = freeTrialUsage.getTotalReportsForClient(clientId);

                if (!canSend) {
                    let reason = 'Report limit exceeded';
                    if (clientReports >= freeTrialUsage.maxReportsPerClient) {
                        reason = `Report limit for this client exceeded (${freeTrialUsage.maxReportsPerClient} per client)`;
                    } else if (freeTrialUsage.totalReportsSent >= freeTrialUsage.maxTotalReports) {
                        reason = `Total report limit exceeded (${freeTrialUsage.maxTotalReports} total)`;
                    }

                    return {
                        allowed: false,
                        reason,
                        currentUsage: clientReports,
                        limit: freeTrialUsage.maxReportsPerClient
                    };
                }

                return {
                    allowed: true,
                    currentUsage: clientReports,
                    limit: freeTrialUsage.maxReportsPerClient
                };
            }

            const freeTrialLimits = {
                clients: 4,
                members: 1
            };

            const currentUsage = await this.getCurrentUsage(organization, limitType);
            const limit = freeTrialLimits[limitType as keyof typeof freeTrialLimits];

            return {
                allowed: currentUsage < limit,
                reason: currentUsage >= limit ? `Free trial ${limitType} limit exceeded` : "",
                currentUsage,
                limit
            };
        }

        const plan = activeSubscription.plan;
        const currentUsage = await this.getCurrentUsage(organization, limitType);

        let limit: number;
        let allowed = true;

        switch (limitType) {
            case 'clients':
                limit = plan.maxClients;
                allowed = currentUsage <= limit;
                break;

            case 'members':
                limit = plan.maxTeamMembers;
                allowed = currentUsage <= limit;
                break;

            default:
                limit = 0;
        }

        return {
            allowed,
            reason: !allowed ? `Subscription ${limitType} limit exceeded` : "",
            currentUsage,
            limit
        };
    }

    async checkFeatureAccess(
        organization: Organization,
        feature: 'publishedLinks' | 'loomIntegration' | 'aiDescription' | 'marklyBadge'
    ): Promise<{ allowed: boolean; requiredPlan?: string }> {
        const activeSubscription = await this.getActiveSubscription(organization);

        if (!activeSubscription) {
            const featureAccess = {
                publishedLinks: false,
                loomIntegration: true,
                aiDescription: true,
                marklyBadge: true
            };

            return {
                allowed: featureAccess[feature],
                requiredPlan: !featureAccess[feature] ? 'Plus or higher' : ""
            };
        }

        const plan = activeSubscription.plan;
        const featureFlags = {
            publishedLinks: plan.hasPublishedLinks,
            loomIntegration: plan.hasLoomIntegration,
            aiDescription: plan.hasAIDescription,
            marklyBadge: plan.hasMarklyBadge
        };

        const allowed = featureFlags[feature];

        if (!allowed) {
            let requiredPlan = 'Contact us';
            if (feature === 'publishedLinks') requiredPlan = 'Plus or higher';
            else if (feature === 'loomIntegration' || feature === 'aiDescription') requiredPlan = 'Plus or higher';

            return { allowed: false, requiredPlan };
        }

        return { allowed: true };
    }

    private async getCurrentUsage(
        organization: Organization,
        limitType: 'reports' | 'clients' | 'members'
    ): Promise<number> {
        switch (limitType) {
            case 'clients':
                return await this.database.em.count(OrganizationClient, { organization });

            case 'members':
                return await this.database.em.count(OrganizationMember, { organization });

            default:
                return 0;
        }
    }

    async recordReportUsage(
        organization: Organization,
        clientId: string,
        user?: User,
        metadata?: Record<string, any>,
        ctx?: Context
    ): Promise<void> {
        const activeSubscription = await this.getActiveSubscription(organization);

        if (!activeSubscription) {
            const freeTrialUsage = await this.database.em.findOne(FreeTrialUsage, { organization });
            if (freeTrialUsage && freeTrialUsage.canSendReportForClient(clientId)) {
                freeTrialUsage.recordReportSent(clientId);
                await this.database.em.persist(freeTrialUsage).flush();

                if (user) {
                    const client = await this.database.em.findOne(OrganizationClient, { uuid: clientId });
                    if (client) {
                        await this.activityLogger.logFreeTrialUsage(
                            organization,
                            user,
                            client,
                            freeTrialUsage.getTotalReportsForClient(clientId),
                            freeTrialUsage.maxReportsPerClient,
                            ctx
                        );
                    }
                }
            }
            return;
        }

        const usageRecord = new UsageRecord();
        usageRecord.subscription = activeSubscription;
        usageRecord.type = UsageType.REPORT_SENT;
        user ? usageRecord.user = user : "";
        usageRecord.quantity = 1;
        usageRecord.metadata = { ...metadata, clientId };

        await this.database.em.persist(usageRecord).flush();
    }

    async createSubscription(
        organization: Organization,
        planId: string,
        paymentMethodId?: string,
        user?: User,
        _ctx?: Context
    ): Promise<OrganizationSubscription> {
        const plan = await this.database.em.findOne(SubscriptionPlan, { uuid: planId });
        if (!plan) {
            throw new Error('Invalid plan ID');
        }

        let stripeCustomerId = organization.stripeCustomerId;
        if (!stripeCustomerId) {
            const customer = await this.stripe.customers.create({
                name: organization.name,
                metadata: {
                    organizationId: organization.uuid
                }
            });
            stripeCustomerId = customer.id;
            organization.stripeCustomerId = stripeCustomerId;
        }

        if (paymentMethodId) {
            await this.stripe.paymentMethods.attach(paymentMethodId, {
                customer: stripeCustomerId
            });

            await this.stripe.customers.update(stripeCustomerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId
                }
            });

            await this.savePaymentMethod(organization, paymentMethodId);
        }

        const subscriptionParams: Stripe.SubscriptionCreateParams = {
            customer: stripeCustomerId,
            items: [{ price: plan.stripePriceId }],
            metadata: {
                organizationId: organization.uuid,
                planId: plan.uuid
            }
        };

        const stripeSubscription = await this.stripe.subscriptions.create(subscriptionParams);

        const subscription = new OrganizationSubscription();
        subscription.organization = organization;
        subscription.plan = plan;
        subscription.stripeSubscriptionId = stripeSubscription.id;
        subscription.stripeCustomerId = stripeCustomerId;
        subscription.status = stripeSubscription.status as SubscriptionStatus;
        subscription.currentPeriodStart = new Date(stripeSubscription.start_date * 1000);
        subscription.currentPeriodEnd = new Date();

        if (stripeSubscription.trial_end) {
            subscription.trialEnd = new Date(stripeSubscription.trial_end * 1000);
        }

        // Mark free trial as converted if applicable
        const freeTrialUsage = await this.database.em.findOne(FreeTrialUsage, { organization });
        if (freeTrialUsage && !freeTrialUsage.trialConvertedAt) {
            freeTrialUsage.trialConvertedAt = new Date();
        }

        await this.database.em.persist([organization, subscription, freeTrialUsage].filter(Boolean)).flush();

        // Log trial conversion if applicable
        if (freeTrialUsage && !freeTrialUsage.trialConvertedAt) {
            await this.activityLogger.logTrialConverted(
                organization,
                user!,
                plan.name,
                freeTrialUsage.totalReportsSent
            );
        }

        logger.info(`Created subscription for organization ${organization.uuid} with plan ${plan.name}`);

        return subscription;
    }

    async updateSubscription(
        organization: Organization,
        newPlanId: string,
        prorationBehavior: 'create_prorations' | 'none' = 'create_prorations',
        user?: User,
        ctx?: Context
    ): Promise<OrganizationSubscription> {
        const activeSubscription = await this.getActiveSubscription(organization);
        if (!activeSubscription) {
            throw new Error('No active subscription found');
        }

        const oldPlan = activeSubscription.plan;
        const newPlan = await this.database.em.findOne(SubscriptionPlan, { uuid: newPlanId });
        if (!newPlan) {
            throw new Error('Invalid plan ID');
        }

        // Update Stripe subscription
        const stripeSubscription = await this.stripe.subscriptions.retrieve(activeSubscription.stripeSubscriptionId);
        const updatedStripeSubscription = await this.stripe.subscriptions.update(stripeSubscription.id, {
            items: [{
                id: stripeSubscription.items.data[0].id,
                price: newPlan.stripePriceId
            }],
            proration_behavior: prorationBehavior
        });

        // Update database subscription
        activeSubscription.plan = newPlan;
        activeSubscription.status = updatedStripeSubscription.status as SubscriptionStatus;

        await this.database.em.persist(activeSubscription).flush();

        // Log subscription update
        await this.activityLogger.logSubscriptionUpdated(
            organization,
            activeSubscription,
            oldPlan,
            newPlan,
            user,
            ctx
        );

        logger.info(`Updated subscription for organization ${organization.uuid} to plan ${newPlan.name}`);

        return activeSubscription;
    }


    async cancelSubscription(
        organization: Organization,
        cancelAtPeriodEnd: boolean = true
    ): Promise<OrganizationSubscription> {
        const activeSubscription = await this.getActiveSubscription(organization);
        if (!activeSubscription) {
            throw new Error('No active subscription found');
        }

        await this.stripe.subscriptions.update(
            activeSubscription.stripeSubscriptionId,
            { cancel_at_period_end: cancelAtPeriodEnd }
        );

        activeSubscription.cancelAtPeriodEnd = cancelAtPeriodEnd;
        if (!cancelAtPeriodEnd) {
            activeSubscription.status = SubscriptionStatus.CANCELED;
            activeSubscription.canceledAt = new Date();
        }

        await this.database.em.persist(activeSubscription).flush();

        logger.info(`Canceled subscription for organization ${organization.uuid}`);

        return activeSubscription;
    }

    async getActiveSubscription(organization: Organization): Promise<OrganizationSubscription | null> {
        return await this.database.em.findOne(OrganizationSubscription, {
            organization,
            status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] }
        }, { populate: ['plan'] });
    }

    async resumeSubscription(
        organization: Organization,
        opts?: { subscriptionScheduleId?: string }
    ): Promise<OrganizationSubscription> {
        await this.initialize();

        const active = await this.getActiveSubscription(organization);
        if (!active) {
            throw new Error('No active or trialing subscription to resume');
        }

        const stripeSub = await this.stripe.subscriptions.retrieve(active.stripeSubscriptionId);
        if (stripeSub.cancel_at_period_end) {
            const updated = await this.stripe.subscriptions.update(active.stripeSubscriptionId, {
                cancel_at_period_end: false,
            });

            active.cancelAtPeriodEnd = false;
            active.status = updated.status as SubscriptionStatus;
            await this.database.em.persist(active).flush();
        }

        if (opts?.subscriptionScheduleId) {
            await this.stripe.subscriptionSchedules.cancel(opts.subscriptionScheduleId);

            const refreshed = await this.stripe.subscriptions.retrieve(active.stripeSubscriptionId);
            active.status = refreshed.status as SubscriptionStatus;
            await this.database.em.persist(active).flush();
        }

        logger.info(`Resumed subscription for organization ${organization.uuid}`);
        return active;
    }

    async getDataRefreshInterval(organization: Organization): Promise<number | undefined> {
        const activeSubscription = await this.getActiveSubscription(organization);

        if (!activeSubscription) {
            return 4;
        }

        const plan = activeSubscription.plan;
        return plan.dataRefreshHours;
    }

    private async savePaymentMethod(organization: Organization, stripePaymentMethodId: string): Promise<PaymentMethod> {
        const stripePaymentMethod = await this.stripe.paymentMethods.retrieve(stripePaymentMethodId);

        const paymentMethod = new PaymentMethod();
        paymentMethod.organization = organization;
        paymentMethod.stripePaymentMethodId = stripePaymentMethodId;
        paymentMethod.type = stripePaymentMethod.type;

        if (stripePaymentMethod.card) {
            paymentMethod.last4 = stripePaymentMethod.card.last4;
            paymentMethod.brand = stripePaymentMethod.card.brand;
            paymentMethod.expiryMonth = stripePaymentMethod.card.exp_month;
            paymentMethod.expiryYear = stripePaymentMethod.card.exp_year;
        }

        const existingMethodsCount = await this.database.em.count(PaymentMethod, { organization });
        if (existingMethodsCount === 0) {
            paymentMethod.isDefault = true;
        }

        await this.database.em.persist(paymentMethod).flush();
        return paymentMethod;
    }

    async handleStripeWebhook(event: Stripe.Event): Promise<void> {
        switch (event.type) {
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
                break;

            case 'invoice.payment_succeeded':
                await this.handleSuccessfulPayment(event.data.object as Stripe.Invoice);
                break;

            case 'invoice.payment_failed':
                await this.handleFailedPayment(event.data.object as Stripe.Invoice);
                break;
        }
    }

    private async handleSubscriptionUpdate(stripeSubscription: Stripe.Subscription): Promise<void> {
        const subscription = await this.database.em.findOne(OrganizationSubscription, {
            stripeSubscriptionId: stripeSubscription.id
        });

        if (subscription) {
            subscription.status = stripeSubscription.status as SubscriptionStatus;
            subscription.currentPeriodStart = new Date(stripeSubscription.start_date * 1000);
            subscription.currentPeriodEnd = new Date();

            if (stripeSubscription.canceled_at) {
                subscription.canceledAt = new Date(stripeSubscription.canceled_at * 1000);
            }

            await this.database.em.persist(subscription).flush();
        }
    }

    private async handleSuccessfulPayment(invoice: Stripe.Invoice): Promise<void> {
        const subscription = await this.database.em.findOne(OrganizationSubscription, {
            stripeSubscriptionId: invoice.parent?.subscription_details?.subscription as string
        }, { populate: ['organization'] });

        if (subscription) {
            await this.activityLogger.logPaymentSuccess(
                subscription.organization,
                (invoice.amount_paid || 0) / 100,
                invoice.id!,
                subscription.stripeSubscriptionId,
                {
                    invoiceNumber: invoice.number,
                    billingReason: invoice.billing_reason,
                    periodStart: invoice.period_start,
                    periodEnd: invoice.period_end
                }
            );

            logger.info(`Payment succeeded for subscription ${subscription.uuid}`);
        }
    }


    private async handleFailedPayment(invoice: Stripe.Invoice): Promise<void> {
        const subscription = await this.database.em.findOne(OrganizationSubscription, {
            stripeSubscriptionId: invoice.parent?.subscription_details?.subscription as string
        }, { populate: ['organization'] });

        if (subscription) {
            await this.activityLogger.logPaymentFailure(
                subscription.organization,
                (invoice.amount_due || 0) / 100,
                invoice.id!,
                invoice.last_finalization_error?.message || 'Unknown error',
                {
                    attemptCount: invoice.attempt_count,
                    nextPaymentAttempt: invoice.next_payment_attempt
                }
            );

            logger.error(`Payment failed for subscription ${subscription.uuid}`);
        }
    }

    async createSetupIntent(organization: Organization) {
        let customerId = organization.stripeCustomerId;
        if (!customerId) {
            const customer = await this.stripe.customers.create({
                name: organization.name,
                metadata: { organizationId: organization.uuid },
            });
            customerId = customer.id;
            organization.stripeCustomerId = customerId;
            await this.database.em.persist(organization).flush();
        }

        const setupIntent = await this.stripe.setupIntents.create({
            customer: customerId,
            payment_method_types: ['card'],
            usage: 'off_session',
            metadata: { organizationId: organization.uuid },
        });

        return {
            clientSecret: setupIntent.client_secret!,
            customerId,
        };
    }

    async createSession(organization: Organization, priceId: string, returnUrl?: string) {
        await this.initialize();

        // Ensure Stripe customer exists
        let customerId = organization.stripeCustomerId;
        if (!customerId) {
            const customer = await this.stripe.customers.create({
                name: organization.name,
                metadata: { organizationId: organization.uuid },
            });
            customerId = customer.id;
            organization.stripeCustomerId = customerId;
            await this.database.em.persist(organization).flush();
        }

        const session = await this.stripe.checkout.sessions.create({
            ui_mode: 'custom',
            mode: 'subscription',
            customer: customerId,
            line_items: [{ price: priceId, quantity: 1 }],
            // Redirect back to your Angular "complete" page
            return_url: returnUrl ?? 'http://localhost:4200/complete?session_id={CHECKOUT_SESSION_ID}',
            // Optional: attach org/plan metadata
            metadata: { organizationId: organization.uuid },
        });

        return { clientSecret: session.client_secret! };
    }

    async finalizeCheckout(sessionId: string) {
        const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['subscription', 'customer'],
        });

        const sub = session.subscription as Stripe.Subscription | null;
        if (!sub) throw new Error('No subscription on session');

        await this.handleSubscriptionUpdate(sub);
        return { ok: true, status: sub.status };
    }

    async scheduleDowngradeAtPeriodEnd(
        organization: Organization,
        newPlanId: string,
        _user?: User
    ): Promise<{ scheduleId: string; scheduledAt: Date | null }> {
        await this.initialize();

        const active = await this.getActiveSubscription(organization);
        if (!active) throw new Error('No active subscription to downgrade');

        const newPlan = await this.database.em.findOne(SubscriptionPlan, { uuid: newPlanId });
        if (!newPlan) throw new Error('Invalid plan ID');

        const currentStripeSub = await this.stripe.subscriptions.retrieve(
            active.stripeSubscriptionId
        );

        const schedule = await this.stripe.subscriptionSchedules.create({
            from_subscription: currentStripeSub.id,
            end_behavior: 'release',
            phases: [
                {
                    items: currentStripeSub.items.data.map(i => ({
                        price: i.price.id,
                        quantity: i.quantity ?? 1,
                    })),
                    iterations: 1,
                    proration_behavior: 'none',
                },
                {
                    items: [
                        {
                            price: newPlan.stripePriceId,
                            quantity: 1,
                        },
                    ],
                    proration_behavior: 'none',
                },
            ],
            metadata: {
                organizationId: organization.uuid,
                planId: newPlan.uuid,
                changeType: 'downgrade',
            },
        });

        const scheduledAt = active.currentPeriodEnd ?? null;

        logger.info(
            `Scheduled downgrade for org ${organization.uuid} to plan ${newPlan.name} at period end.`
        );

        return { scheduleId: schedule.id, scheduledAt };
    }
}