import { describe, expect, it } from 'vitest';
import { createTestRelay } from '../helpers/create-relay';
import { empty, json } from '../helpers/mock-http-client';

describe('WebhooksResource', () => {
    it('list() gets /webhooks', async () => {
        const { relay, mock } = createTestRelay(() => json([]));

        const result = await relay.webhooks.list();

        expect(result).toEqual([]);
        expect(mock.calls[0]!.url).toBe('https://relay.hyvor.com/api/console/webhooks');
        expect(mock.calls[0]!.init.method).toBe('GET');
    });

    it('create() posts to /webhooks', async () => {
        const { relay, mock } = createTestRelay(() => json({ id: 1, url: 'https://example.com/hook', description: null, events: [] }));

        await relay.webhooks.create({ url: 'https://example.com/hook', description: 'My webhook', events: ['domain.created'] });

        const call = mock.calls[0]!;
        expect(call.url).toBe('https://relay.hyvor.com/api/console/webhooks');
        expect(call.init.method).toBe('POST');
        expect(JSON.parse(call.init.body as string)).toEqual({
            url: 'https://example.com/hook',
            description: 'My webhook',
            events: ['domain.created'],
        });
    });

    it('update() patches /webhooks/:id', async () => {
        const { relay, mock } = createTestRelay(() => json({ id: 1, url: 'https://example.com/hook', description: null, events: [] }));

        await relay.webhooks.update(1, { url: 'https://example.com/hook', description: 'Updated', events: ['domain.deleted'] });

        const call = mock.calls[0]!;
        expect(call.url).toBe('https://relay.hyvor.com/api/console/webhooks/1');
        expect(call.init.method).toBe('PATCH');
        expect(JSON.parse(call.init.body as string)).toEqual({
            url: 'https://example.com/hook',
            description: 'Updated',
            events: ['domain.deleted'],
        });
    });

    it('delete() sends a DELETE request to /webhooks/:id', async () => {
        const { relay, mock } = createTestRelay(() => empty());

        await relay.webhooks.delete(1);

        expect(mock.calls[0]!.url).toBe('https://relay.hyvor.com/api/console/webhooks/1');
        expect(mock.calls[0]!.init.method).toBe('DELETE');
    });

    it('deliveries() gets /webhooks/deliveries with an optional webhook_id filter', async () => {
        const { relay, mock } = createTestRelay(() => json([]));

        await relay.webhooks.deliveries({ webhook_id: 7 });

        const url = new URL(mock.calls[0]!.url);
        expect(url.pathname).toBe('/api/console/webhooks/deliveries');
        expect(url.searchParams.get('webhook_id')).toBe('7');
    });

    it('deliveries() works without parameters', async () => {
        const { relay, mock } = createTestRelay(() => json([]));

        await relay.webhooks.deliveries();

        expect(mock.calls[0]!.url).toBe('https://relay.hyvor.com/api/console/webhooks/deliveries');
    });
});
