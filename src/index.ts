//classes
export { BullMQWrapper } from "./lib/classes/BullMQWrapper.js";
export { Log } from "./lib/classes/Logger.js";
export { Validator, type ValidationRule } from "./lib/classes/Validator.js";
export { CookiesWrapper } from "./lib/classes/CookiesWrapper.js";
export { GCPSecretsManager } from "./lib/classes/SecretsManager.js";
export { GCSWrapper } from "./lib/classes/GCSWrapper.js";
export { PubSubWrapper } from "./lib/classes/PubSub.js";

//utils
export { AuthenticationUtil } from "./lib/utils/AuthenticationUtil.js";
export { MarklieRouter } from "./lib/utils/MarklieRouter.js";


//database singleton
export { Database } from "./lib/db/config/DB.js";

//redis
export { RedisClient } from "./lib/db/redis/Redis.js";

//entities
export { User } from "./lib/entities/User.js";
export * from "./lib/entities/ClientCommunicationChannel.js";
export { Organization } from "./lib/entities/Organization.js";
export { OrganizationClient } from "./lib/entities/OrganizationClient.js";
export { OrganizationToken } from "./lib/entities/OrganizationToken.js";
export { OrganizationMember } from "./lib/entities/OrganizationMember.js";
export { SchedulingOption } from "./lib/entities/SchedulingOption.js";
export { SchedulingTemplate } from "./lib/entities/SchedulingTemplate.js";
export { OnboardingQuestionAnswer } from "./lib/entities/OnboardingQuestionAnswer.js";
export { OrganizationInvite } from "./lib/entities/OrganizationInvite.js";
export { ClientAdAccount } from "./lib/entities/ClientAdAccount.js";
export { AdAccountCustomFormula } from "./lib/entities/AdAccountCustomFormula.js";
export { Report } from "./lib/entities/Report.js";
export { ClientToken } from "./lib/entities/ClientToken.js";
export { ChangeEmailToken } from "./lib/entities/ChangeEmailToken.js";
export { ClientAccessToken } from "./lib/entities/ClientAccessToken.js";
export { ClientAccessRequest } from "./lib/entities/ClientAccessRequest.js";
export { ActivityLog } from "./lib/entities/ActivityLog.js";
export { Image } from "./lib/entities/Image.js";
export { Feedback } from "./lib/entities/Feedback.js";
export { FeatureSuggestion } from "./lib/entities/FeatureSuggestion.js";
export { FeatureComment } from "./lib/entities/FeatureComment.js";
export { FeatureUpvote } from "./lib/entities/FeatureUpvote.js";
export { SubscriptionPlan } from "./lib/entities/subscription/SubscriptionPlan.js";
export { FreeTrialUsage } from "./lib/entities/subscription/FreeTrialUsage.js";
export { OrganizationSubscription } from "./lib/entities/subscription/OrganizationSubscription.js";
export { UsageRecord } from "./lib/entities/subscription/UsageRecord.js";
export { PaymentMethod } from "./lib/entities/subscription/PaymentMethod.js";

//middlewares
export { AuthMiddleware } from "./lib/middlewares/AuthMiddleware.js";
export { RoleMiddleware } from "./lib/middlewares/RolesMiddleware.js";
export { ErrorMiddleware } from "./lib/middlewares/ErrorMiddleware.js";
export { ValidationMiddleware } from "./lib/middlewares/ValidationMiddleware.js";
export { CookiesMiddleware } from "./lib/middlewares/CookiesMiddleware.js";
export { ActivityLogMiddleware } from "./lib/middlewares/LogsMiddleware.js";
export { SentryMiddleware } from "./lib/middlewares/SentryMiddleware.js";
export { SubscriptionMiddleware } from "./lib/middlewares/SubscriptionMiddleware.js";

//interfaces
export * from "./lib/interfaces/AuthInterfaces.js";
export * from "./lib/interfaces/FacebookInterfaces.js";
export * from "./lib/interfaces/ReportsInterfaces.js";
export * from "./lib/interfaces/CustomFormulasInterfaces.js";
export * from "./lib/interfaces/UserInterfaces.js";
export * from "./lib/interfaces/OnboardingInterfaces.js";
export * from "./lib/interfaces/PubSubInterfaces.js";
export * from "./lib/interfaces/SlackInterfaces.js";
export * from "./lib/interfaces/ClientInterfaces.js";
export * from "./lib/interfaces/FeatureSuggestionInterfaces.js";
export * from "./lib/interfaces/SubscriptionInterfaces.js";

//schemas
export * from "./lib/schemas/ZodSchemas.js";

//enums
export * from "./lib/enums/enums.js";

//migration
export { runMigrations } from "./lib/db/config/Migrator.js";

//apis
export { SlackApi } from "./lib/apis/SlackApi.js";

//services
export { TokenService } from "./lib/services/TokenService.js";
export { SlackService } from "./lib/services/SlackService.js";
export { SendGridService } from "./lib/services/SendgridService.js";
export { WhapiService } from "./lib/services/WhapiService.js";
export { StripeService } from "./lib/services/StripeService.js";

//Configuration management
export {
  baseEnvSchema,
  reportsEnvSchema,
  notificationEnvSchema,
  authEnvSchema,
  ConfigService,
  ReportsConfigService,
} from "./lib/config/ConfigService.js";

//Errors
export { MarklieError, ErrorCode } from "./lib/errors/Errors.js";

//Resilience pattern
export {
  CircuitBreaker,
  CircuitBreakerManager,
} from "./lib/resilience/CircuitBreaker.js";
export {
  CircuitBreakerState,
  type CircuitBreakerOptions,
  type CircuitBreakerMetrics,
} from "./lib/interfaces/CircutBreakerIntrefaces.js";
