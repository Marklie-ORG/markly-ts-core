import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { ClientAdAccount } from "./ClientAdAccount.js";
import { CustomFormulaFormat } from "../enums/enums.js";

@Entity()
export class AdAccountCustomFormula extends BaseEntity {
    @Property()
    name!: string;

    @Property()
    formula!: string;

    @Property()
    format!: CustomFormulaFormat;

    @Property({ nullable: true })
    description!: string;

    @ManyToOne(() => ClientAdAccount)
    adAccount?: ClientAdAccount;
}
