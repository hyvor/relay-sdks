/**
 * Base class for all errors thrown by this SDK.
 */
export class RelayError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'RelayError';
    }
}

/**
 * Thrown when the Relay API responds with a non-2xx status code.
 */
export class ApiError extends RelayError {
    /**
     * The HTTP status code of the response.
     */
    readonly status: number;

    /**
     * The parsed JSON response body, if any.
     */
    readonly body: unknown;

    constructor(message: string, status: number, body: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.body = body;
    }
}

/**
 * Thrown when the API responds with `422 Unprocessable Entity`, meaning
 * the request body failed validation.
 */
export class ValidationFailedError extends ApiError {
    /**
     * A map of field names to a list of validation error messages.
     */
    readonly errors: Record<string, string[]>;

    constructor(message: string, body: unknown, errors: Record<string, string[]>) {
        super(message, 422, body);
        this.name = 'ValidationFailedError';
        this.errors = errors;
    }
}

/**
 * Thrown when the API responds with `429 Too Many Requests`.
 */
export class RateLimitError extends ApiError {
    /**
     * The maximum number of requests allowed in the current window,
     * from the `X-RateLimit-Limit` header.
     */
    readonly limit?: number;

    /**
     * The number of requests remaining in the current window,
     * from the `X-RateLimit-Remaining` header.
     */
    readonly remaining?: number;

    /**
     * The unix timestamp (seconds) when the current window resets,
     * from the `X-RateLimit-Reset` header.
     */
    readonly reset?: number;

    /**
     * The number of seconds to wait before retrying,
     * from the `Retry-After` header.
     */
    readonly retryAfter?: number;

    constructor(
        message: string,
        body: unknown,
        info: { limit?: number; remaining?: number; reset?: number; retryAfter?: number },
    ) {
        super(message, 429, body);
        this.name = 'RateLimitError';
        this.limit = info.limit;
        this.remaining = info.remaining;
        this.reset = info.reset;
        this.retryAfter = info.retryAfter;
    }
}

/**
 * Thrown when the API responds with a `5xx` status code.
 */
export class ServerError extends ApiError {
    constructor(message: string, status: number, body: unknown) {
        super(message, status, body);
        this.name = 'ServerError';
    }
}

/**
 * Thrown when a request fails before a response is received
 * (e.g. DNS failure, connection refused, aborted).
 */
export class NetworkError extends RelayError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'NetworkError';
    }
}

/**
 * Thrown when a request does not complete within the configured
 * connect or request timeout.
 */
export class TimeoutError extends NetworkError {
    constructor(message: string) {
        super(message);
        this.name = 'TimeoutError';
    }
}

/**
 * Thrown by {@link WebhookController} when a webhook request's
 * signature is missing or does not match the expected value.
 */
export class WebhookSignatureError extends RelayError {
    constructor(message: string) {
        super(message);
        this.name = 'WebhookSignatureError';
    }
}
