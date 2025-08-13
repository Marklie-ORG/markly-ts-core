import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { User } from "./User.js";

@Entity()
export class Feedback extends BaseEntity {
	@Property()
	message!: string;

	@ManyToOne(() => User)
	user!: User;
} 