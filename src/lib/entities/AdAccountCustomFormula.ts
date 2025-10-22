import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { ClientAdAccount } from "./ClientAdAccount.js";

@Entity()
export class AdAccountCustomFormula extends BaseEntity {
  @Property()
  name!: string;

  @Property({ type: "text" })
  formula!: string;

  @Property()
  format!: "currency" | "number" | "percentage" | "decimal";

  @Property({ type: "text", nullable: true })
  description?: string;

  @ManyToOne(() => ClientAdAccount)
  adAccount!: ClientAdAccount;
}
