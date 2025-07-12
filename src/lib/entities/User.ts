import {
  Entity,
  Property,
  BeforeCreate,
  BeforeUpdate,
  ManyToOne,
  type EventArgs,
} from "@mikro-orm/core";
import bcrypt from "bcryptjs";
import { BaseEntity } from "./BaseEntity.js";
import { Organization } from "./Organization.js";

@Entity()
export class User extends BaseEntity {
  @Property({ nullable: true })
  firstName?: string;

  @Property({ nullable: true })
  lastName?: string;

  @Property({ unique: true })
  email!: string;

  @Property()
  password!: string;

  @ManyToOne({ entity: () => Organization, nullable: true })
  activeOrganization?: Organization;

  @BeforeCreate()
  async hashPasswordOnCreate() {
    this.password = await bcrypt.hash(this.password, 10);
  }

  @BeforeUpdate()
  async hashPasswordOnUpdate(args: EventArgs<User>) {
    const changeSet = args.changeSet;
    if (changeSet && changeSet.payload.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }
}
