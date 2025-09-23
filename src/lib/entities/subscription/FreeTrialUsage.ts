import { Entity, Property, ManyToOne } from "@mikro-orm/core";
import {BaseEntity} from "../BaseEntity.js";
import {Organization} from "../Organization.js";

@Entity()
export class FreeTrialUsage extends BaseEntity {
    @ManyToOne(() => Organization, { unique: true })
    organization!: Organization;

    @Property()
    trialStartedAt: Date = new Date();

    @Property()
    trialDurationDays: number = 15;

    @Property()
    trialEndDate: Date = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    @Property({ nullable: true })
    trialConvertedAt?: Date;

    @Property()
    maxReportsPerClient: number = 2;

    @Property()
    maxTotalReports: number = 8;

    @Property({ type: "json" })
    reportsPerClient: Record<string, number> = {};

    @Property()
    totalReportsSent: number = 0;

    getTotalReportsForClient(clientId: string): number {
        return this.reportsPerClient[clientId] || 0;
    }

    canSendReportForClient(clientId: string): boolean {
        const clientReports = this.getTotalReportsForClient(clientId);
        return clientReports < this.maxReportsPerClient &&
            this.totalReportsSent < this.maxTotalReports &&
            new Date() < this.trialEndDate;
    }

    getRemainingReportsForClient(clientId: string): number {
        const used = this.getTotalReportsForClient(clientId);
        return Math.max(0, this.maxReportsPerClient - used);
    }

    getRemainingTotalReports(): number {
        return Math.max(0, this.maxTotalReports - this.totalReportsSent);
    }

    recordReportSent(clientId: string): void {
        if (!this.reportsPerClient[clientId]) {
            this.reportsPerClient[clientId] = 0;
        }
        this.reportsPerClient[clientId]++;
        this.totalReportsSent++;
    }
}