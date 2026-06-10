import { type RequestOptions, type ResolvedRelayOptions } from './config';
import { ApiError, NetworkError, RateLimitError, ServerError, TimeoutError, ValidationFailedError } from './errors';
import { USER_AGENT } from './version';

const RETRY_BASE_DELAY_MS = 100;

export type QueryParams = object;

export interface RequestParams {
    query?: QueryParams;
    body?: unknown;
    idempotencyKey?: string;
    options?: RequestOptions;
}

interface AttemptResult {
    status: number;
    headers: Headers;
    bodyText: string;
}

/**
 * Handles building and sending requests to the Relay API: URL and
 * header construction, timeouts, retries with exponential backoff,
 * and mapping error responses to typed errors.
 */
export class Transport {
    constructor(private readonly options: ResolvedRelayOptions) {}

    async request<T>(method: string, path: string, params: RequestParams = {}): Promise<T> {
        const url = this.buildUrl(path, params.query);
        const headers: Record<string, string> = {
            Authorization: `Bearer ${this.options.apiKey}`,
            Accept: 'application/json',
            'User-Agent': USER_AGENT,
        };

        let body: string | undefined;
        if (params.body !== undefined) {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(params.body);
        }

        if (params.idempotencyKey) {
            headers['Idempotency-Key'] = params.idempotencyKey;
        }

        const connectTimeoutMs = params.options?.connectTimeoutMs ?? this.options.connectTimeoutMs;
        const requestTimeoutMs = params.options?.requestTimeoutMs ?? this.options.requestTimeoutMs;
        const maxAttempts = Math.max(1, params.options?.retry?.maxAttempts ?? this.options.retry.maxAttempts);
        const backoffFactor = params.options?.retry?.backoffFactor ?? this.options.retry.backoffFactor;

        let attempt = 1;
        while (true) {
            this.options.logger.debug('Sending request', { method, url, attempt });

            let result: AttemptResult;
            try {
                result = await this.performAttempt(url, { method, headers, body }, connectTimeoutMs, requestTimeoutMs);
            } catch (error) {
                this.options.logger.warn('Request failed', {
                    method,
                    url,
                    attempt,
                    error: (error as Error).message,
                });

                if (attempt < maxAttempts) {
                    await this.delay(this.backoffDelay(attempt, backoffFactor));
                    attempt++;
                    continue;
                }

                throw error;
            }

            if (result.status >= 200 && result.status < 300) {
                this.options.logger.debug('Request succeeded', { method, url, status: result.status });
                return this.parseBody<T>(result.bodyText);
            }

            const error = this.mapError(result.status, result.headers, result.bodyText);

            if (this.isRetryable(error) && attempt < maxAttempts) {
                this.options.logger.warn('Retrying request', { method, url, attempt, status: result.status });
                const delayMs =
                    error instanceof RateLimitError && error.retryAfter !== undefined
                        ? error.retryAfter * 1000
                        : this.backoffDelay(attempt, backoffFactor);
                await this.delay(delayMs);
                attempt++;
                continue;
            }

            this.options.logger.error('Request failed', { method, url, status: result.status });
            throw error;
        }
    }

    private buildUrl(path: string, query?: QueryParams): string {
        const url = new URL(`${this.options.baseUrl}/api/console${path}`);

        if (query) {
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined) {
                    url.searchParams.set(key, String(value));
                }
            }
        }

        return url.toString();
    }

    private async performAttempt(
        url: string,
        init: { method: string; headers: Record<string, string>; body?: string },
        connectTimeoutMs: number,
        requestTimeoutMs: number,
    ): Promise<AttemptResult> {
        const controller = new AbortController();

        const totalTimer = setTimeout(() => {
            controller.abort(new TimeoutError(`Request timed out after ${requestTimeoutMs}ms`));
        }, requestTimeoutMs);

        const connectTimer = setTimeout(() => {
            controller.abort(new TimeoutError(`Connection timed out after ${connectTimeoutMs}ms`));
        }, connectTimeoutMs);

        try {
            const response = await this.options.httpClient.fetch(url, { ...init, signal: controller.signal });
            clearTimeout(connectTimer);

            const bodyText = await response.text();
            clearTimeout(totalTimer);

            return { status: response.status, headers: response.headers, bodyText };
        } catch (error) {
            clearTimeout(connectTimer);
            clearTimeout(totalTimer);

            if (controller.signal.aborted && controller.signal.reason instanceof TimeoutError) {
                throw controller.signal.reason;
            }

            throw new NetworkError(`Network request failed: ${error instanceof Error ? error.message : String(error)}`, {
                cause: error,
            });
        }
    }

    private isRetryable(error: ApiError): boolean {
        return error instanceof ServerError || error instanceof RateLimitError;
    }

    private backoffDelay(attempt: number, backoffFactor: number): number {
        return RETRY_BASE_DELAY_MS * Math.pow(backoffFactor, attempt - 1);
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private mapError(status: number, headers: Headers, bodyText: string): ApiError {
        const body = this.tryParseJson(bodyText);
        const message = this.extractMessage(body) ?? `Request failed with status ${status}`;

        if (status === 422) {
            const errors =
                body !== null && typeof body === 'object' && 'errors' in body && typeof body.errors === 'object' && body.errors !== null
                    ? (body.errors as Record<string, string[]>)
                    : {};
            return new ValidationFailedError(message, body, errors);
        }

        if (status === 429) {
            return new RateLimitError(message, body, {
                limit: this.parseHeaderInt(headers, 'X-RateLimit-Limit'),
                remaining: this.parseHeaderInt(headers, 'X-RateLimit-Remaining'),
                reset: this.parseHeaderInt(headers, 'X-RateLimit-Reset'),
                retryAfter: this.parseHeaderInt(headers, 'Retry-After'),
            });
        }

        if (status >= 500) {
            return new ServerError(message, status, body);
        }

        return new ApiError(message, status, body);
    }

    private extractMessage(body: unknown): string | undefined {
        if (body !== null && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
            return body.message;
        }

        return undefined;
    }

    private parseHeaderInt(headers: Headers, name: string): number | undefined {
        const value = headers.get(name);

        if (value === null) {
            return undefined;
        }

        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }

    private tryParseJson(text: string): unknown {
        if (text.trim().length === 0) {
            return null;
        }

        try {
            return JSON.parse(text);
        } catch {
            return null;
        }
    }

    private parseBody<T>(text: string): T {
        if (text.trim().length === 0) {
            return undefined as unknown as T;
        }

        return JSON.parse(text) as unknown as T;
    }
}
