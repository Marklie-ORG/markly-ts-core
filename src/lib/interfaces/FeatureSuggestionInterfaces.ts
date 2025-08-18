export interface CreateFeatureSuggestionRequest {
	title: string;
	description: string;
}

export interface FeatureSuggestionDto {
	uuid: string;
	title: string;
	description: string;
	createdAt: string;
	updatedAt: string;
	user: { uuid: string; firstName?: string; lastName?: string; email: string };
	organizationUuid: string;
	upvotes: number;
	userHasUpvoted: boolean;
	commentsCount: number;
}

export interface CreateFeatureCommentRequest {
	suggestionUuid: string;
	comment: string;
}

export interface ToggleFeatureUpvoteRequest {
	suggestionUuid: string;
}

export interface FeatureCommentDto {
	uuid: string;
	comment: string;
	createdAt: string;
	user: { uuid: string; firstName?: string; lastName?: string; email: string };
} 