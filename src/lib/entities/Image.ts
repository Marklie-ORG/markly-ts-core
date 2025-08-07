import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { Organization } from "./Organization.js";

@Entity()
export class Image extends BaseEntity {
  @ManyToOne(() => Organization)
  organization!: Organization;

  @Property()
  imageName!: string;

  @Property({ type: "text" })
  gsUri!: string;
}
