import { describe, expect, it } from 'vitest';
import { createTestRelay } from '../helpers/create-relay';
import { empty, json } from '../helpers/mock-http-client';

describe('DomainsResource', () => {
    it('list() gets /domains with query parameters', async () => {
        const { relay, mock } = createTestRelay(() => json([]));

        const result = await relay.domains.list({ limit: 10, offset: 5, search: 'example' });

        expect(result).toEqual([]);
        const call = mock.calls[0]!;
        expect(call.init.method).toBe('GET');

        const url = new URL(call.url);
        expect(url.pathname).toBe('/api/console/domains');
        expect(url.searchParams.get('limit')).toBe('10');
        expect(url.searchParams.get('offset')).toBe('5');
        expect(url.searchParams.get('search')).toBe('example');
    });

    it('create() posts to /domains', async () => {
        const { relay, mock } = createTestRelay(() => json({ id: 1, domain: 'example.com' }));

        await relay.domains.create({ domain: 'example.com' });

        const call = mock.calls[0]!;
        expect(call.url).toBe('https://relay.hyvor.com/api/console/domains');
        expect(call.init.method).toBe('POST');
        expect(JSON.parse(call.init.body as string)).toEqual({ domain: 'example.com' });
    });

    it('verify() posts the identifier to /domains/verify', async () => {
        const { relay, mock } = createTestRelay(() => json({ id: 1, domain: 'example.com' }));

        await relay.domains.verify({ id: 1 });

        const call = mock.calls[0]!;
        expect(call.url).toBe('https://relay.hyvor.com/api/console/domains/verify');
        expect(call.init.method).toBe('POST');
        expect(JSON.parse(call.init.body as string)).toEqual({ id: 1 });
    });

    it('get() looks up a domain by id', async () => {
        const { relay, mock } = createTestRelay(() => json({ id: 1, domain: 'example.com' }));

        await relay.domains.get({ id: 1 });

        const call = mock.calls[0]!;
        const url = new URL(call.url);
        expect(url.pathname).toBe('/api/console/domains/by');
        expect(url.searchParams.get('id')).toBe('1');
    });

    it('get() looks up a domain by domain name', async () => {
        const { relay, mock } = createTestRelay(() => json({ id: 1, domain: 'example.com' }));

        await relay.domains.get({ domain: 'example.com' });

        const url = new URL(mock.calls[0]!.url);
        expect(url.searchParams.get('domain')).toBe('example.com');
    });

    it('delete() sends a DELETE request with the identifier as a query', async () => {
        const { relay, mock } = createTestRelay(() => empty());

        await relay.domains.delete({ id: 1 });

        const call = mock.calls[0]!;
        expect(call.init.method).toBe('DELETE');
        const url = new URL(call.url);
        expect(url.pathname).toBe('/api/console/domains');
        expect(url.searchParams.get('id')).toBe('1');
    });
});
