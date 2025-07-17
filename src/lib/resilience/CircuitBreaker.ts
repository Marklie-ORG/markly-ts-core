import {
  type CircuitBreakerMetrics,
  type CircuitBreakerOptions,
  CircuitBreakerState,
} from "lib/interfaces/CircutBreakerIntrefaces.js";
import { Log } from "../classes/Logger.js";
import { MarklieError } from "../errors/Errors.js";

const logger = Log.getInstance().extend("circuit-breaker");

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private consecutiveFailures = 0;
  private lastFailureTime: number | undefined;
  private lastSuccessTime: number | undefined;
  private totalRequests = 0;
  private successfulRequests = 0;
  private failedRequests = 0;
  private nextAttempt?: number | undefined;
  private readonly startTime: number;

  constructor(
    private readonly name: string,
    private readonly options: CircuitBreakerOptions = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 300000, // 5 minutes
    },
  ) {
    this.startTime = Date.now();
    logger.info(
      `Circuit breaker initialized: ${this.name} ${JSON.stringify({
        failureThreshold: this.options.failureThreshold,
        recoveryTimeout: this.options.recoveryTimeout,
      })}`,
    );
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    return this.callWithFallback(operation);
  }

  private async callWithFallback<T>(operation: () => Promise<T>): Promise<T> {
    this.checkState();

    if (this.state === CircuitBreakerState.OPEN) {
      throw MarklieError.circuitBreakerOpen(this.name);
    }

    this.totalRequests++;

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  private onSuccess(): void {
    this.consecutiveFailures = 0;
    this.lastSuccessTime = Date.now();
    this.successfulRequests++;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.changeState(CircuitBreakerState.CLOSED);
      logger.info(`Circuit breaker recovered: ${this.name}`);
    }
  }

  private onFailure(error: any): void {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();
    this.failedRequests++;

    if (this.isExpectedError(error)) {
      logger.debug(
        `Expected error in circuit breaker ${this.name}, not counting as failure`,
      );
      return;
    }

    logger.warn(
      `Circuit breaker failure ${this.consecutiveFailures}/${this.options.failureThreshold}: ${this.name} ${JSON.stringify(
        {
          error: error.message || "Unknown error",
        },
      )}`,
    );

    if (this.consecutiveFailures >= this.options.failureThreshold) {
      this.changeState(CircuitBreakerState.OPEN);
      this.nextAttempt = Date.now() + this.options.recoveryTimeout;
      logger.error(`Circuit breaker opened: ${this.name}`);
    }
  }

  private isExpectedError(error: any): boolean {
    if (!this.options.expectedErrorCodes || !error.code) {
      return false;
    }

    return this.options.expectedErrorCodes.includes(error.code);
  }

  private checkState(): void {
    if (
      this.state === CircuitBreakerState.OPEN &&
      this.nextAttempt &&
      Date.now() >= this.nextAttempt
    ) {
      this.changeState(CircuitBreakerState.HALF_OPEN);
      logger.info(`Circuit breaker entering half-open state: ${this.name}`);
    }
  }

  private changeState(newState: CircuitBreakerState): void {
    const oldState = this.state;
    this.state = newState;

    if (this.options.onStateChange) {
      this.options.onStateChange(newState, this.name);
    }

    logger.info(
      `Circuit breaker state change: ${this.name} ${oldState} -> ${newState}`,
    );
  }

  getMetrics(): CircuitBreakerMetrics {
    return {
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      state: this.state,
      uptime: Date.now() - this.startTime,
    };
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  isHealthy(): boolean {
    return this.state === CircuitBreakerState.CLOSED;
  }

  getFailureRate(): number {
    if (this.totalRequests === 0) return 0;
    return this.failedRequests / this.totalRequests;
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.consecutiveFailures = 0;
    this.lastFailureTime = undefined;
    this.nextAttempt = undefined;

    logger.info(`Circuit breaker manually reset: ${this.name}`);
  }

  forceOpen(): void {
    this.changeState(CircuitBreakerState.OPEN);
    this.nextAttempt = undefined;

    logger.warn(`Circuit breaker manually opened: ${this.name}`);
  }

  forceClose(): void {
    this.changeState(CircuitBreakerState.CLOSED);
    this.consecutiveFailures = 0;
    this.nextAttempt = undefined;

    logger.warn(`Circuit breaker manually closed: ${this.name}`);
  }
}

export class CircuitBreakerManager {
  private static instance: CircuitBreakerManager;
  private circuitBreakers = new Map<string, CircuitBreaker>();

  private constructor() {}

  static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager();
    }
    return CircuitBreakerManager.instance;
  }

  getOrCreate(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, new CircuitBreaker(name, options));
    }
    return this.circuitBreakers.get(name)!;
  }

  get(name: string): CircuitBreaker | undefined {
    return this.circuitBreakers.get(name);
  }

  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};

    for (const [name, breaker] of this.circuitBreakers) {
      metrics[name] = breaker.getMetrics();
    }

    return metrics;
  }

  getHealthySummary(): { total: number; healthy: number; unhealthy: number } {
    let total = 0;
    let healthy = 0;

    for (const breaker of this.circuitBreakers.values()) {
      total++;
      if (breaker.isHealthy()) {
        healthy++;
      }
    }

    return {
      total,
      healthy,
      unhealthy: total - healthy,
    };
  }
}
