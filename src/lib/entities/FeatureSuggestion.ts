import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { User } from "./User.js";
import { Organization } from "./Organization.js";

@Entity()
export class FeatureSuggestion extends BaseEntity {
	@Property()
	title!: string;

	@Property({ type: "text" })
	description!: string;

	@ManyToOne(() => User)
	user!: User;

	@ManyToOne(() => Organization)
	organization!: Organization;
} 