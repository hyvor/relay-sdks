import { describe, expect, it } from 'vitest';
import { createTestRelay } from '../helpers/create-relay';
import { empty, json } from '../helpers/mock-http-client';

describe('SuppressionsResource', () => {
    it('list() gets /suppressions with query parameters', async () => {
        const { relay, mock } = createTestRelay(() => json([]));

        const result = await relay.suppressions.list({ email: 'user@example.com', reason: 'bounce' });

        expect(result).toEqual([]);
        const url = new URL(mock.calls[0]!.url);
        expect(url.pathname).toBe('/api/console/suppressions');
        expect(url.searchParams.get('email')).toBe('user@example.com');
        expect(url.searchParams.get('reason')).toBe('bounce');
    });

    it('list() works without parameters', async () => {
        const { relay, mock } = createTestRelay(() => json([]));

        await relay.suppressions.list();

        expect(mock.calls[0]!.url).toBe('https://relay.hyvor.com/api/console/suppressions');
    });

    it('delete() sends a DELETE request to /suppressions/:id', async () => {
        const { relay, mock } = createTestRelay(() => empty());

        await relay.suppressions.delete(1);

        expect(mock.calls[0]!.url).toBe('https://relay.hyvor.com/api/console/suppressions/1');
        expect(mock.calls[0]!.init.method).toBe('DELETE');
    });
});
