import { describe, expect, it } from 'vitest';
import {
    ApiError,
    NetworkError,
    RateLimitError,
    RelayError,
    ServerError,
    TimeoutError,
    ValidationFailedError,
    WebhookSignatureError,
} from '../src/errors';

describe('errors', () => {
    it('RelayError is a named Error', () => {
        const error = new RelayError('something went wrong');

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('RelayError');
        expect(error.message).toBe('something went wrong');
    });

    it('ApiError carries the status and body', () => {
        const error = new ApiError('Bad Request', 400, { message: 'Bad Request' });

        expect(error).toBeInstanceOf(RelayError);
        expect(error.name).toBe('ApiError');
        expect(error.status).toBe(400);
        expect(error.body).toEqual({ message: 'Bad Request' });
    });

    it('ValidationFailedError carries field errors', () => {
        const body = { message: 'Validation failed', errors: { from: ['The from field is required.'] } };
        const error = new ValidationFailedError('Validation failed', body, { from: ['The from field is required.'] });

        expect(error).toBeInstanceOf(ApiError);
        expect(error.name).toBe('ValidationFailedError');
        expect(error.status).toBe(422);
        expect(error.body).toEqual(body);
        expect(error.errors).toEqual({ from: ['The from field is required.'] });
    });

    it('RateLimitError carries rate limit info', () => {
        const error = new RateLimitError('Too Many Requests', null, {
            limit: 100,
            remaining: 0,
            reset: 1700000000,
            retryAfter: 30,
        });

        expect(error).toBeInstanceOf(ApiError);
        expect(error.name).toBe('RateLimitError');
        expect(error.status).toBe(429);
        expect(error.limit).toBe(100);
        expect(error.remaining).toBe(0);
        expect(error.reset).toBe(1700000000);
        expect(error.retryAfter).toBe(30);
    });

    it('RateLimitError allows omitted rate limit info', () => {
        const error = new RateLimitError('Too Many Requests', null, {});

        expect(error.limit).toBeUndefined();
        expect(error.remaining).toBeUndefined();
        expect(error.reset).toBeUndefined();
        expect(error.retryAfter).toBeUndefined();
    });

    it('ServerError carries the status', () => {
        const error = new ServerError('Internal Server Error', 503, null);

        expect(error).toBeInstanceOf(ApiError);
        expect(error.name).toBe('ServerError');
        expect(error.status).toBe(503);
    });

    it('NetworkError wraps the underlying cause', () => {
        const cause = new TypeError('fetch failed');
        const error = new NetworkError('Network request failed: fetch failed', { cause });

        expect(error).toBeInstanceOf(RelayError);
        expect(error.name).toBe('NetworkError');
        expect(error.cause).toBe(cause);
    });

    it('TimeoutError is a NetworkError', () => {
        const error = new TimeoutError('Request timed out after 10000ms');

        expect(error).toBeInstanceOf(NetworkError);
        expect(error.name).toBe('TimeoutError');
    });

    it('WebhookSignatureError is a RelayError', () => {
        const error = new WebhookSignatureError('Signature does not match');

        expect(error).toBeInstanceOf(RelayError);
        expect(error.name).toBe('WebhookSignatureError');
        expect(error.message).toBe('Signature does not match');
    });
});
