export enum ErrorCode {
    // Client errors (4xx)
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
    NOT_FOUND = 'NOT_FOUND',
    CONFLICT = 'CONFLICT',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    BAD_REQUEST = 'BAD_REQUEST',

    // Server errors (5xx)
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    DATABASE_ERROR = 'DATABASE_ERROR',
    EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
    CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
    CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN',
}

export class MarklieError extends Error {
    public readonly code: ErrorCode;
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly context: Record<string, any> | undefined;
    public readonly timestamp: string;
    public readonly service: string | undefined;
    public readonly requestId: string | undefined;

    constructor(
        message: string,
        code: ErrorCode,
        statusCode = 500,
        isOperational = true,
        context?: Record<string, any>,
        service?: string,
        requestId?: string
    ) {
        super(message);

        Object.setPrototypeOf(this, new.target.prototype);

        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.context = context;
        this.timestamp = new Date().toISOString();
        this.service = service;
        this.requestId = requestId;

        Error.captureStackTrace?.(this, this.constructor);
    }

    static validation(message: string, context?: Record<string, any>, service?: string) {
        return new MarklieError(message, ErrorCode.VALIDATION_ERROR, 400, true, context, service);
    }

    static notFound(resource: string, identifier?: string, service?: string) {
        return new MarklieError(
            `${resource} not found${identifier ? ` with identifier: ${identifier}` : ''}`,
            ErrorCode.NOT_FOUND,
            404,
            true,
            { resource, identifier },
            service
        );
    }

    static unauthorized(message: string = 'Unauthorized access', service?: string) {
        return new MarklieError(message, ErrorCode.AUTHENTICATION_ERROR, 401, true, undefined, service);
    }

    static forbidden(message: string = 'Forbidden access', service?: string) {
        return new MarklieError(message, ErrorCode.AUTHORIZATION_ERROR, 403, true, undefined, service);
    }

    static conflict(message: string, context?: Record<string, any>, service?: string) {
        return new MarklieError(message, ErrorCode.CONFLICT, 409, true, context, service);
    }

    static rateLimit(message: string = 'Rate limit exceeded', service?: string) {
        return new MarklieError(message, ErrorCode.RATE_LIMIT_EXCEEDED, 429, true, undefined, service);
    }

    static badRequest(message: string, context?: Record<string, any>, service?: string) {
        return new MarklieError(message, ErrorCode.BAD_REQUEST, 400, true, context, service);
    }

    static internal(message: string, context?: Record<string, any>, service?: string) {
        return new MarklieError(message, ErrorCode.INTERNAL_ERROR, 500, true, context, service);
    }

    static database(operation: string, originalError?: Error, service?: string) {
        return new MarklieError(
            `Database error during ${operation}`,
            ErrorCode.DATABASE_ERROR,
            500,
            true,
            {
                operation,
                originalError: originalError?.message,
                stack: originalError?.stack
            },
            service
        );
    }

    static externalApi(serviceName: string, originalError?: Error, service?: string) {
        return new MarklieError(
            `External API error: ${serviceName}`,
            ErrorCode.EXTERNAL_API_ERROR,
            502,
            true,
            {
                externalService: serviceName,
                originalError: originalError?.message,
                stack: originalError?.stack
            },
            service
        );
    }

    static circuitBreakerOpen(serviceName: string, service?: string) {
        return new MarklieError(
            `Circuit breaker is open for ${serviceName}`,
            ErrorCode.CIRCUIT_BREAKER_OPEN,
            503,
            true,
            { externalService: serviceName },
            service
        );
    }

    static serviceUnavailable(message: string, context?: Record<string, any>, service?: string) {
        return new MarklieError(message, ErrorCode.SERVICE_UNAVAILABLE, 503, true, context, service);
    }

    static configuration(message: string, context?: Record<string, any>, service?: string) {
        return new MarklieError(message, ErrorCode.CONFIGURATION_ERROR, 500, false, context, service);
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
            isOperational: this.isOperational,
            context: this.context,
            timestamp: this.timestamp,
            service: this.service,
            requestId: this.requestId,
            stack: this.stack
        };
    }

    toClientError(includeDev: boolean = false) {
        const clientError: any = {
            code: this.code,
            message: this.message,
            timestamp: this.timestamp,
            requestId: this.requestId
        };

        if (includeDev) {
            clientError.context = this.context;
            clientError.service = this.service;
        }

        return clientError;
    }
}