import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { User } from "./User.js";

@Entity()
export class PasswordRecoveryToken extends BaseEntity {
  @ManyToOne(() => User)
  user!: User;

  @Property({ type: "text" })
  token!: string;

  @Property({ type: "boolean", default: false })
  isUsed!: boolean;
}
