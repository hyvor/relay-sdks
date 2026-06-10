export type AnalyticsPeriod = '24h' | '7d' | '30d';

export interface AnalyticsStatsParams {
    /**
     * @default "30d"
     */
    period?: AnalyticsPeriod;
}

export interface AnalyticsStats {
    sends: number;
    bounce_rate: number;
    complaint_rate: number;
}

/**
 * The Relay API does not document a fixed schema for the sends chart
 * response, so it is typed loosely.
 */
export type AnalyticsSendsChart = Record<string, unknown>;
