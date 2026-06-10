import { describe, expect, it } from 'vitest';
import { createTestRelay } from '../helpers/create-relay';
import { empty, json } from '../helpers/mock-http-client';

describe('ApiKeysResource', () => {
    it('list() gets /api-keys', async () => {
        const { relay, mock } = createTestRelay(() => json([]));

        const result = await relay.apiKeys.list();

        expect(result).toEqual([]);
        expect(mock.calls[0]!.url).toBe('https://relay.hyvor.com/api/console/api-keys');
        expect(mock.calls[0]!.init.method).toBe('GET');
    });

    it('create() posts to /api-keys', async () => {
        const { relay, mock } = createTestRelay(() => json({ id: 1, name: 'My key', scopes: ['sends.send'], created_at: '', is_enabled: true, last_accessed_at: null }));

        await relay.apiKeys.create({ name: 'My key', scopes: ['sends.send'] });

        const call = mock.calls[0]!;
        expect(call.url).toBe('https://relay.hyvor.com/api/console/api-keys');
        expect(call.init.method).toBe('POST');
        expect(JSON.parse(call.init.body as string)).toEqual({ name: 'My key', scopes: ['sends.send'] });
    });

    it('update() patches /api-keys/:id', async () => {
        const { relay, mock } = createTestRelay(() => json({ id: 1, name: 'Renamed', scopes: [], created_at: '', is_enabled: false, last_accessed_at: null }));

        await relay.apiKeys.update(1, { name: 'Renamed', is_enabled: false });

        const call = mock.calls[0]!;
        expect(call.url).toBe('https://relay.hyvor.com/api/console/api-keys/1');
        expect(call.init.method).toBe('PATCH');
        expect(JSON.parse(call.init.body as string)).toEqual({ name: 'Renamed', is_enabled: false });
    });

    it('delete() sends a DELETE request to /api-keys/:id', async () => {
        const { relay, mock } = createTestRelay(() => empty());

        await relay.apiKeys.delete(1);

        expect(mock.calls[0]!.url).toBe('https://relay.hyvor.com/api/console/api-keys/1');
        expect(mock.calls[0]!.init.method).toBe('DELETE');
    });
});
