import { describe, expect, it } from 'vitest';
import { createTestRelay } from '../helpers/create-relay';
import { json } from '../helpers/mock-http-client';

describe('AnalyticsResource', () => {
    it('stats() gets /analytics/stats with an optional period', async () => {
        const { relay, mock } = createTestRelay(() => json({ sends: 100, bounce_rate: 0.01, complaint_rate: 0 }));

        const result = await relay.analytics.stats({ period: '7d' });

        expect(result).toEqual({ sends: 100, bounce_rate: 0.01, complaint_rate: 0 });
        const url = new URL(mock.calls[0]!.url);
        expect(url.pathname).toBe('/api/console/analytics/stats');
        expect(url.searchParams.get('period')).toBe('7d');
    });

    it('stats() works without parameters', async () => {
        const { relay, mock } = createTestRelay(() => json({ sends: 0, bounce_rate: 0, complaint_rate: 0 }));

        await relay.analytics.stats();

        expect(mock.calls[0]!.url).toBe('https://relay.hyvor.com/api/console/analytics/stats');
    });

    it('sendsChart() gets /analytics/sends/chart', async () => {
        const { relay, mock } = createTestRelay(() => json({ labels: [], data: [] }));

        const result = await relay.analytics.sendsChart();

        expect(result).toEqual({ labels: [], data: [] });
        expect(mock.calls[0]!.url).toBe('https://relay.hyvor.com/api/console/analytics/sends/chart');
        expect(mock.calls[0]!.init.method).toBe('GET');
    });
});
