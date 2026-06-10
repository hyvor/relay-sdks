import { describe, expect, it } from 'vitest';
import { createTestRelay } from '../helpers/create-relay';
import { getHeader, json } from '../helpers/mock-http-client';

describe('SendsResource', () => {
    it('send() posts to /sends and forwards the idempotency key', async () => {
        const { relay, mock } = createTestRelay(() => json({ id: 1, message_id: 'msg_123' }));

        const result = await relay.sends.send(
            { from: 'you@example.com', to: 'user@example.com', subject: 'Hi', body_text: 'Hello' },
            { idempotencyKey: 'unique-key' },
        );

        expect(result).toEqual({ id: 1, message_id: 'msg_123' });
        expect(mock.calls).toHaveLength(1);

        const call = mock.calls[0]!;
        expect(call.url).toBe('https://relay.hyvor.com/api/console/sends');
        expect(call.init.method).toBe('POST');
        expect(getHeader(call.init, 'Idempotency-Key')).toBe('unique-key');
        expect(JSON.parse(call.init.body as string)).toEqual({
            from: 'you@example.com',
            to: 'user@example.com',
            subject: 'Hi',
            body_text: 'Hello',
        });
    });

    it('send() works without an idempotency key', async () => {
        const { relay, mock } = createTestRelay(() => json({ id: 1, message_id: 'msg_123' }));

        await relay.sends.send({ from: 'you@example.com', to: 'user@example.com' });

        expect(getHeader(mock.calls[0]!.init, 'Idempotency-Key')).toBeNull();
    });

    it('list() gets /sends with query parameters', async () => {
        const { relay, mock } = createTestRelay(() => json([]));

        const result = await relay.sends.list({ limit: 10, status: 'bounced' });

        expect(result).toEqual([]);
        const call = mock.calls[0]!;
        expect(call.init.method).toBe('GET');

        const url = new URL(call.url);
        expect(url.pathname).toBe('/api/console/sends');
        expect(url.searchParams.get('limit')).toBe('10');
        expect(url.searchParams.get('status')).toBe('bounced');
    });

    it('get() gets /sends/:id', async () => {
        const { relay, mock } = createTestRelay(() => json({ id: 42 }));

        await relay.sends.get(42);

        expect(mock.calls[0]!.url).toBe('https://relay.hyvor.com/api/console/sends/42');
        expect(mock.calls[0]!.init.method).toBe('GET');
    });

    it('getByUuid() gets /sends/uuid/:uuid', async () => {
        const { relay, mock } = createTestRelay(() => json({ id: 42 }));

        await relay.sends.getByUuid('abc-123');

        expect(mock.calls[0]!.url).toBe('https://relay.hyvor.com/api/console/sends/uuid/abc-123');
    });

    it('retry() posts to /sends/:id/retry with an empty body by default', async () => {
        const { relay, mock } = createTestRelay(() => json({ retried_recipients: 2 }));

        const result = await relay.sends.retry(42);

        expect(result).toEqual({ retried_recipients: 2 });
        expect(mock.calls[0]!.url).toBe('https://relay.hyvor.com/api/console/sends/42/retry');
        expect(mock.calls[0]!.init.method).toBe('POST');
        expect(JSON.parse(mock.calls[0]!.init.body as string)).toEqual({});
    });

    it('retry() forwards the provided body', async () => {
        const { relay, mock } = createTestRelay(() => json({ retried_recipients: 1 }));

        await relay.sends.retry(42, { send_after: 1700000000 });

        expect(JSON.parse(mock.calls[0]!.init.body as string)).toEqual({ send_after: 1700000000 });
    });
});
