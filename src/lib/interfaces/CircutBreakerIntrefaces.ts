export enum CircuitBreakerState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerOptions {
    failureThreshold: number;
    recoveryTimeout: number;
    monitoringPeriod: number;
    expectedErrorCodes?: string[];
    onStateChange?: (state: CircuitBreakerState, name: string) => void;
}

export interface CircuitBreakerMetrics {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    consecutiveFailures: number;
    lastFailureTime?: number | undefined;
    lastSuccessTime?: number | undefined;
    state: CircuitBreakerState;
    uptime: number;
}