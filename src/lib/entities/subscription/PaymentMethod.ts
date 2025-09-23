import { Entity, Property, ManyToOne } from "@mikro-orm/core";
import {Organization} from "../Organization.js";
import {BaseEntity} from "../BaseEntity.js";


@Entity()
export class PaymentMethod extends BaseEntity {
    @ManyToOne(() => Organization)
    organization!: Organization;

    @Property()
    stripePaymentMethodId!: string;

    @Property()
    type!: string;

    @Property()
    last4!: string;

    @Property({ nullable: true })
    brand?: string;

    @Property()
    isDefault: boolean = false;

    @Property({ nullable: true })
    expiryMonth?: number;

    @Property({ nullable: true })
    expiryYear?: number;
}