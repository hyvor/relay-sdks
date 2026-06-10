import { FetchHttpClient, type HttpClient } from './http-client';
import { type Logger, NoopLogger } from './logger';

/**
 * Options that control retry behavior. Can be set globally on the
 * {@link Relay} client, or overridden per request.
 */
export interface RetryOptions {
    /**
     * The maximum number of attempts (including the first) before
     * giving up.
     */
    maxAttempts?: number;

    /**
     * The multiplier applied to the base delay between each retry
     * (exponential backoff).
     */
    backoffFactor?: number;
}

/**
 * Global options for the {@link Relay} client.
 */
export interface RelayOptions {
    /**
     * Your Hyvor Relay API key.
     */
    apiKey: string;

    /**
     * The base URL of the Hyvor Relay API.
     *
     * @default "https://relay.hyvor.com"
     */
    baseUrl?: string;

    /**
     * The maximum time, in milliseconds, to wait for a connection
     * (response headers) to be established.
     *
     * @default 5000
     */
    connectTimeoutMs?: number;

    /**
     * The maximum time, in milliseconds, to wait for the entire
     * request (including reading the response body) to complete.
     *
     * @default 10000
     */
    requestTimeoutMs?: number;

    /**
     * Retry behavior for failed requests (network errors, `429`, and
     * `5xx` responses).
     */
    retry?: RetryOptions;

    /**
     * A logger used for debugging and observability.
     *
     * @default NoopLogger
     */
    logger?: Logger;

    /**
     * The HTTP client used to make requests. Override this for
     * testing, mocking, or to use a different underlying HTTP library.
     *
     * @default FetchHttpClient
     */
    httpClient?: HttpClient;
}

/**
 * Per-request options that override the corresponding global
 * {@link RelayOptions}.
 */
export interface RequestOptions {
    connectTimeoutMs?: number;
    requestTimeoutMs?: number;
    retry?: RetryOptions;
}

export const DEFAULT_BASE_URL = 'https://relay.hyvor.com';
export const DEFAULT_CONNECT_TIMEOUT_MS = 5000;
export const DEFAULT_REQUEST_TIMEOUT_MS = 10000;
export const DEFAULT_RETRY_MAX_ATTEMPTS = 3;
export const DEFAULT_RETRY_BACKOFF_FACTOR = 2;

export interface ResolvedRelayOptions {
    apiKey: string;
    baseUrl: string;
    connectTimeoutMs: number;
    requestTimeoutMs: number;
    retry: Required<RetryOptions>;
    logger: Logger;
    httpClient: HttpClient;
}

export function resolveOptions(options: RelayOptions): ResolvedRelayOptions {
    return {
        apiKey: options.apiKey,
        baseUrl: (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, ''),
        connectTimeoutMs: options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS,
        requestTimeoutMs: options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
        retry: {
            maxAttempts: Math.max(1, options.retry?.maxAttempts ?? DEFAULT_RETRY_MAX_ATTEMPTS),
            backoffFactor: options.retry?.backoffFactor ?? DEFAULT_RETRY_BACKOFF_FACTOR,
        },
        logger: options.logger ?? new NoopLogger(),
        httpClient: options.httpClient ?? new FetchHttpClient(),
    };
}
