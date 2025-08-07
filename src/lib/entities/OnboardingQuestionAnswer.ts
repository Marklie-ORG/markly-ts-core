import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { User } from "./User.js";

@Entity()
export class OnboardingQuestionAnswer extends BaseEntity {
  @ManyToOne(() => User)
  user!: User;

  @Property()
  question!: string;

  @Property()
  answer!: string;
}
