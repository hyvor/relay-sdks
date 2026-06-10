import { describe, expect, it } from 'vitest';
import { resolveOptions, type RelayOptions } from '../src/config';
import {
    ApiError,
    NetworkError,
    RateLimitError,
    ServerError,
    TimeoutError,
    ValidationFailedError,
} from '../src/errors';
import { Transport } from '../src/transport';
import {
    createMockHttpClient,
    empty,
    getHeader,
    hangsUntilAborted,
    json,
    networkError,
    sequence,
    slowBody,
    text,
    type MockHandler,
    type MockHttpClient,
} from './helpers/mock-http-client';

function createTransport(handler: MockHandler, overrides: Partial<RelayOptions> = {}): { transport: Transport; mock: MockHttpClient } {
    const mock = createMockHttpClient(handler);
    const transport = new Transport(
        resolveOptions({
            apiKey: 'test-key',
            retry: { maxAttempts: 1 },
            ...overrides,
            httpClient: mock,
        }),
    );

    return { transport, mock };
}

describe('Transport', () => {
    describe('request building', () => {
        it('sends a GET request with the expected headers and no body', async () => {
            const { transport, mock } = createTransport(() => json({ ok: true }));

            const result = await transport.request<{ ok: boolean }>('GET', '/sends');

            expect(result).toEqual({ ok: true });
            expect(mock.calls).toHaveLength(1);

            const call = mock.calls[0]!;
            expect(call.url).toBe('https://relay.hyvor.com/api/console/sends');
            expect(call.init.method).toBe('GET');
            expect(getHeader(call.init, 'Authorization')).toBe('Bearer test-key');
            expect(getHeader(call.init, 'Accept')).toBe('application/json');
            expect(getHeader(call.init, 'User-Agent')).toBe('hyvor/relay-js/0.0.0-dev');
            expect(getHeader(call.init, 'Content-Type')).toBeNull();
            expect(getHeader(call.init, 'Idempotency-Key')).toBeNull();
            expect(call.init.body).toBeUndefined();
        });

        it('builds query strings, skipping undefined values', async () => {
            const { transport, mock } = createTransport(() => json([]));

            await transport.request('GET', '/sends', { query: { limit: 10, status: undefined, before_id: 5 } });

            const url = new URL(mock.calls[0]!.url);
            expect(url.pathname).toBe('/api/console/sends');
            expect(url.searchParams.get('limit')).toBe('10');
            expect(url.searchParams.get('before_id')).toBe('5');
            expect(url.searchParams.has('status')).toBe(false);
        });

        it('does not add a query string when no query is given', async () => {
            const { transport, mock } = createTransport(() => json([]));

            await transport.request('GET', '/sends');

            expect(mock.calls[0]!.url).toBe('https://relay.hyvor.com/api/console/sends');
        });

        it('sends a JSON body and Content-Type for requests with a body', async () => {
            const { transport, mock } = createTransport(() => json({ id: 1, message_id: 'msg_1' }));

            await transport.request('POST', '/sends', { body: { from: 'a@example.com', to: 'b@example.com' } });

            const call = mock.calls[0]!;
            expect(call.init.method).toBe('POST');
            expect(getHeader(call.init, 'Content-Type')).toBe('application/json');
            expect(JSON.parse(call.init.body as string)).toEqual({ from: 'a@example.com', to: 'b@example.com' });
        });

        it('sets the Idempotency-Key header when provided', async () => {
            const { transport, mock } = createTransport(() => json({ id: 1, message_id: 'msg_1' }));

            await transport.request('POST', '/sends', { body: {}, idempotencyKey: 'unique-key' });

            expect(getHeader(mock.calls[0]!.init, 'Idempotency-Key')).toBe('unique-key');
        });

        it('returns undefined for empty response bodies', async () => {
            const { transport } = createTransport(() => empty(204));

            const result = await transport.request('DELETE', '/domains/1');

            expect(result).toBeUndefined();
        });

        it('uses a custom base URL', async () => {
            const { transport, mock } = createTransport(() => json({}), { baseUrl: 'https://custom.example.com/' });

            await transport.request('GET', '/sends');

            expect(mock.calls[0]!.url).toBe('https://custom.example.com/api/console/sends');
        });
    });

    describe('error mapping - 422 Validation Failed', () => {
        it('maps 422 responses to ValidationFailedError with field errors', async () => {
            const body = { message: 'The given data was invalid.', errors: { from: ['The from field is required.'] } };
            const { transport, mock } = createTransport(() => json(body, { status: 422 }), { retry: { maxAttempts: 3 } });

            const error = await transport.request('POST', '/sends', { body: {} }).catch((error: unknown) => error);

            expect(error).toBeInstanceOf(ValidationFailedError);
            expect(error).toMatchObject({
                message: 'The given data was invalid.',
                status: 422,
                body,
                errors: { from: ['The from field is required.'] },
            });
            expect(mock.calls).toHaveLength(1);
        });

        it('defaults errors to {} when the body has no errors field', async () => {
            const { transport } = createTransport(() => json({ message: 'Invalid' }, { status: 422 }));

            await expect(transport.request('POST', '/sends', { body: {} })).rejects.toMatchObject({ errors: {} });
        });

        it('defaults errors to {} when the errors field is not an object', async () => {
            const { transport } = createTransport(() => json({ message: 'Invalid', errors: 'oops' }, { status: 422 }));

            await expect(transport.request('POST', '/sends', { body: {} })).rejects.toMatchObject({ errors: {} });
        });

        it('defaults errors to {} when the errors field is null', async () => {
            const { transport } = createTransport(() => json({ message: 'Invalid', errors: null }, { status: 422 }));

            await expect(transport.request('POST', '/sends', { body: {} })).rejects.toMatchObject({ errors: {} });
        });

        it('defaults errors and message when the body is empty', async () => {
            const { transport } = createTransport(() => empty(422));

            await expect(transport.request('POST', '/sends', { body: {} })).rejects.toMatchObject({
                message: 'Request failed with status 422',
                body: null,
                errors: {},
            });
        });
    });

    describe('error mapping - 429 Too Many Requests', () => {
        it('maps 429 responses to RateLimitError with rate limit headers', async () => {
            const { transport } = createTransport(() =>
                json(
                    { message: 'Too Many Requests' },
                    {
                        status: 429,
                        headers: {
                            'X-RateLimit-Limit': '100',
                            'X-RateLimit-Remaining': '0',
                            'X-RateLimit-Reset': '1700000000',
                            'Retry-After': '30',
                        },
                    },
                ),
            );

            await expect(transport.request('GET', '/sends')).rejects.toMatchObject({
                status: 429,
                limit: 100,
                remaining: 0,
                reset: 1700000000,
                retryAfter: 30,
            });
        });

        it('leaves rate limit fields undefined when headers are absent', async () => {
            const { transport } = createTransport(() => json({ message: 'Too Many Requests' }, { status: 429 }));

            const error = await transport.request('GET', '/sends').catch((error: unknown) => error);

            expect(error).toBeInstanceOf(RateLimitError);
            expect(error).toMatchObject({
                limit: undefined,
                remaining: undefined,
                reset: undefined,
                retryAfter: undefined,
            });
        });

        it('leaves rate limit fields undefined when headers are not numeric', async () => {
            const { transport } = createTransport(() =>
                json(
                    { message: 'Too Many Requests' },
                    { status: 429, headers: { 'X-RateLimit-Limit': 'not-a-number' } },
                ),
            );

            await expect(transport.request('GET', '/sends')).rejects.toMatchObject({ limit: undefined });
        });
    });

    describe('error mapping - 5xx and other status codes', () => {
        it('maps 5xx responses to ServerError', async () => {
            const { transport } = createTransport(() => json({ message: 'Internal Server Error' }, { status: 503 }));

            const error = await transport.request('GET', '/sends').catch((error: unknown) => error);

            expect(error).toBeInstanceOf(ServerError);
            expect(error).toMatchObject({ status: 503 });
        });

        it('maps other status codes to a generic ApiError without retrying', async () => {
            const { transport, mock } = createTransport(() => json({ message: 'Not Found' }, { status: 404 }), {
                retry: { maxAttempts: 3 },
            });

            const error = await transport.request('GET', '/sends/999').catch((error: unknown) => error);

            expect(error).toBeInstanceOf(ApiError);
            expect(error).not.toBeInstanceOf(ServerError);
            expect(error).not.toBeInstanceOf(RateLimitError);
            expect(error).toMatchObject({ status: 404, message: 'Not Found' });
            expect(mock.calls).toHaveLength(1);
        });

        it('uses a default message when the body has no message field', async () => {
            const { transport } = createTransport(() => json({}, { status: 400 }));

            await expect(transport.request('GET', '/sends')).rejects.toMatchObject({
                message: 'Request failed with status 400',
            });
        });

        it('uses a default message when the body is not valid JSON', async () => {
            const { transport } = createTransport(() => text('not json', { status: 400 }));

            await expect(transport.request('GET', '/sends')).rejects.toMatchObject({
                message: 'Request failed with status 400',
                body: null,
            });
        });

        it('uses a default message when the message field is not a string', async () => {
            const { transport } = createTransport(() => json({ message: 123 }, { status: 400 }));

            await expect(transport.request('GET', '/sends')).rejects.toMatchObject({
                message: 'Request failed with status 400',
            });
        });

        it('uses a default message when the body is a JSON primitive', async () => {
            const { transport } = createTransport(() => text('"oops"', { status: 400 }));

            await expect(transport.request('GET', '/sends')).rejects.toMatchObject({
                message: 'Request failed with status 400',
                body: 'oops',
            });
        });
    });

    describe('retries', () => {
        it('retries 429 responses honoring the Retry-After header', async () => {
            const { transport, mock } = createTransport(
                sequence(
                    () => json({ message: 'Too Many Requests' }, { status: 429, headers: { 'Retry-After': '0' } }),
                    () => json({ ok: true }),
                ),
                { retry: { maxAttempts: 2 } },
            );

            const result = await transport.request('GET', '/sends');

            expect(result).toEqual({ ok: true });
            expect(mock.calls).toHaveLength(2);
        });

        it('retries 429 responses with exponential backoff when Retry-After is absent', async () => {
            const { transport, mock } = createTransport(
                sequence(() => json({ message: 'Too Many Requests' }, { status: 429 }), () => json({ ok: true })),
                { retry: { maxAttempts: 2, backoffFactor: 1 } },
            );

            const result = await transport.request('GET', '/sends');

            expect(result).toEqual({ ok: true });
            expect(mock.calls).toHaveLength(2);
        });

        it('retries 5xx responses with exponential backoff', async () => {
            const { transport, mock } = createTransport(
                sequence(() => json({ message: 'Internal Server Error' }, { status: 500 }), () => json({ ok: true })),
                { retry: { maxAttempts: 2, backoffFactor: 1 } },
            );

            const result = await transport.request('GET', '/sends');

            expect(result).toEqual({ ok: true });
            expect(mock.calls).toHaveLength(2);
        });

        it('throws ServerError once retries are exhausted', async () => {
            const { transport, mock } = createTransport(() => json({ message: 'Internal Server Error' }, { status: 500 }), {
                retry: { maxAttempts: 2, backoffFactor: 1 },
            });

            await expect(transport.request('GET', '/sends')).rejects.toBeInstanceOf(ServerError);
            expect(mock.calls).toHaveLength(2);
        });

        it('retries network errors and succeeds', async () => {
            const { transport, mock } = createTransport(sequence(networkError(), () => json({ ok: true })), {
                retry: { maxAttempts: 2, backoffFactor: 1 },
            });

            const result = await transport.request('GET', '/sends');

            expect(result).toEqual({ ok: true });
            expect(mock.calls).toHaveLength(2);
        });

        it('throws NetworkError once retries are exhausted', async () => {
            const { transport, mock } = createTransport(networkError('connection refused'), {
                retry: { maxAttempts: 2, backoffFactor: 1 },
            });

            const error = await transport.request('GET', '/sends').catch((error: unknown) => error);

            expect(error).toBeInstanceOf(NetworkError);
            expect((error as NetworkError).message).toContain('connection refused');
            expect((error as NetworkError).cause).toBeInstanceOf(TypeError);
            expect(mock.calls).toHaveLength(2);
        });

        it('wraps non-Error values thrown by the HTTP client in NetworkError', async () => {
            const { transport } = createTransport(() => {
                throw 'boom';
            });

            const error = await transport.request('GET', '/sends').catch((error: unknown) => error);

            expect(error).toBeInstanceOf(NetworkError);
            expect((error as NetworkError).message).toContain('boom');
            expect((error as NetworkError).cause).toBe('boom');
        });
    });

    describe('timeouts', () => {
        it('throws TimeoutError when the connection times out', async () => {
            const { transport, mock } = createTransport(hangsUntilAborted(), {
                connectTimeoutMs: 20,
                requestTimeoutMs: 1000,
            });

            const error = await transport.request('GET', '/sends').catch((error: unknown) => error);

            expect(error).toBeInstanceOf(TimeoutError);
            expect((error as TimeoutError).message).toBe('Connection timed out after 20ms');
            expect(mock.calls).toHaveLength(1);
        });

        it('throws TimeoutError when reading the response body times out', async () => {
            const { transport, mock } = createTransport(slowBody(200), {
                connectTimeoutMs: 1000,
                requestTimeoutMs: 20,
            });

            const error = await transport.request('GET', '/sends').catch((error: unknown) => error);

            expect(error).toBeInstanceOf(TimeoutError);
            expect((error as TimeoutError).message).toBe('Request timed out after 20ms');
            expect(mock.calls).toHaveLength(1);
        });

        it('retries after a timeout until attempts are exhausted', async () => {
            const { transport, mock } = createTransport(hangsUntilAborted(), {
                connectTimeoutMs: 20,
                requestTimeoutMs: 1000,
                retry: { maxAttempts: 2, backoffFactor: 1 },
            });

            const error = await transport.request('GET', '/sends').catch((error: unknown) => error);

            expect(error).toBeInstanceOf(TimeoutError);
            expect(mock.calls).toHaveLength(2);
        });
    });

    describe('per-request option overrides', () => {
        it('overrides the connect and request timeouts', async () => {
            const { transport, mock } = createTransport(hangsUntilAborted(), {
                connectTimeoutMs: 5000,
                requestTimeoutMs: 10000,
            });

            const error = await transport
                .request('GET', '/sends', { options: { connectTimeoutMs: 20, requestTimeoutMs: 1000 } })
                .catch((error: unknown) => error);

            expect(error).toBeInstanceOf(TimeoutError);
            expect((error as TimeoutError).message).toBe('Connection timed out after 20ms');
            expect(mock.calls).toHaveLength(1);
        });

        it('overrides the retry configuration', async () => {
            const { transport, mock } = createTransport(
                sequence(() => json({ message: 'Internal Server Error' }, { status: 500 }), () => json({ ok: true })),
                { retry: { maxAttempts: 1 } },
            );

            const result = await transport.request('GET', '/sends', { options: { retry: { maxAttempts: 2, backoffFactor: 1 } } });

            expect(result).toEqual({ ok: true });
            expect(mock.calls).toHaveLength(2);
        });

        it('overrides only part of the retry configuration', async () => {
            const { transport, mock } = createTransport(
                sequence(() => json({ message: 'Internal Server Error' }, { status: 500 }), () => json({ ok: true })),
                { retry: { maxAttempts: 1, backoffFactor: 5 } },
            );

            const result = await transport.request('GET', '/sends', { options: { retry: { maxAttempts: 2 } } });

            expect(result).toEqual({ ok: true });
            expect(mock.calls).toHaveLength(2);
        });
    });
});
