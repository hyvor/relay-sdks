import { describe, expect, it } from 'vitest';
import {
    DEFAULT_BASE_URL,
    DEFAULT_CONNECT_TIMEOUT_MS,
    DEFAULT_REQUEST_TIMEOUT_MS,
    DEFAULT_RETRY_BACKOFF_FACTOR,
    DEFAULT_RETRY_MAX_ATTEMPTS,
    resolveOptions,
} from '../src/config';
import { FetchHttpClient } from '../src/http-client';
import { ConsoleLogger, NoopLogger } from '../src/logger';

describe('resolveOptions', () => {
    it('applies defaults when no options are given', () => {
        const resolved = resolveOptions({ apiKey: 'secret' });

        expect(resolved.apiKey).toBe('secret');
        expect(resolved.baseUrl).toBe(DEFAULT_BASE_URL);
        expect(resolved.connectTimeoutMs).toBe(DEFAULT_CONNECT_TIMEOUT_MS);
        expect(resolved.requestTimeoutMs).toBe(DEFAULT_REQUEST_TIMEOUT_MS);
        expect(resolved.retry).toEqual({
            maxAttempts: DEFAULT_RETRY_MAX_ATTEMPTS,
            backoffFactor: DEFAULT_RETRY_BACKOFF_FACTOR,
        });
        expect(resolved.logger).toBeInstanceOf(NoopLogger);
        expect(resolved.httpClient).toBeInstanceOf(FetchHttpClient);
    });

    it('applies provided overrides', () => {
        const logger = new ConsoleLogger();
        const httpClient = new FetchHttpClient();

        const resolved = resolveOptions({
            apiKey: 'secret',
            baseUrl: 'https://example.com',
            connectTimeoutMs: 1000,
            requestTimeoutMs: 2000,
            retry: { maxAttempts: 5, backoffFactor: 3 },
            logger,
            httpClient,
        });

        expect(resolved.baseUrl).toBe('https://example.com');
        expect(resolved.connectTimeoutMs).toBe(1000);
        expect(resolved.requestTimeoutMs).toBe(2000);
        expect(resolved.retry).toEqual({ maxAttempts: 5, backoffFactor: 3 });
        expect(resolved.logger).toBe(logger);
        expect(resolved.httpClient).toBe(httpClient);
    });

    it('applies retry defaults when retry is partially set', () => {
        const resolved = resolveOptions({ apiKey: 'secret', retry: {} });

        expect(resolved.retry).toEqual({
            maxAttempts: DEFAULT_RETRY_MAX_ATTEMPTS,
            backoffFactor: DEFAULT_RETRY_BACKOFF_FACTOR,
        });
    });

    it('clamps maxAttempts to a minimum of 1', () => {
        const resolved = resolveOptions({ apiKey: 'secret', retry: { maxAttempts: 0 } });

        expect(resolved.retry.maxAttempts).toBe(1);
    });

    it('strips trailing slashes from baseUrl', () => {
        const resolved = resolveOptions({ apiKey: 'secret', baseUrl: 'https://example.com///' });

        expect(resolved.baseUrl).toBe('https://example.com');
    });
});
