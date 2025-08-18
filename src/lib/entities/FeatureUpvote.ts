import { Entity, ManyToOne, Property, Unique } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { User } from "./User.js";
import { FeatureSuggestion } from "./FeatureSuggestion.js";

@Entity()
@Unique({ properties: ["user", "suggestion"] })
export class FeatureUpvote extends BaseEntity {
	@ManyToOne(() => FeatureSuggestion)
	suggestion!: FeatureSuggestion;

	@ManyToOne(() => User)
	user!: User;

	@Property({ type: Boolean })
	value: boolean = true;
} 