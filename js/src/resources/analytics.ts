import type { RequestOptions } from '../config';
import type { Transport } from '../transport';
import type { AnalyticsSendsChart, AnalyticsStats, AnalyticsStatsParams } from '../types/analytics';

/**
 * Read-only analytics for your project.
 */
export class AnalyticsResource {
    constructor(private readonly transport: Transport) {}

    /**
     * Get aggregate send/bounce/complaint statistics.
     */
    stats(params?: AnalyticsStatsParams, options?: RequestOptions): Promise<AnalyticsStats> {
        return this.transport.request<AnalyticsStats>('GET', '/analytics/stats', { query: params, options });
    }

    /**
     * Get chart data for sends over time.
     */
    sendsChart(options?: RequestOptions): Promise<AnalyticsSendsChart> {
        return this.transport.request<AnalyticsSendsChart>('GET', '/analytics/sends/chart', { options });
    }
}
