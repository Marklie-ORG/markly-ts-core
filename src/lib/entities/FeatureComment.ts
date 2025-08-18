import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { User } from "./User.js";
import { FeatureSuggestion } from "./FeatureSuggestion.js";

@Entity()
export class FeatureComment extends BaseEntity {
	@ManyToOne(() => FeatureSuggestion)
	suggestion!: FeatureSuggestion;

	@ManyToOne(() => User)
	user!: User;

	@Property({ type: "text" })
	comment!: string;
} 