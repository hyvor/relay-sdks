import { afterEach, describe, expect, it, vi } from 'vitest';
import { FetchHttpClient } from '../src/http-client';

describe('FetchHttpClient', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('delegates to the global fetch', async () => {
        const response = new Response('ok', { status: 200 });
        const fetchMock = vi.fn().mockResolvedValue(response);
        vi.stubGlobal('fetch', fetchMock);

        const client = new FetchHttpClient();
        const result = await client.fetch('https://example.com', { method: 'GET' });

        expect(fetchMock).toHaveBeenCalledWith('https://example.com', { method: 'GET' });
        expect(result).toBe(response);
    });
});
