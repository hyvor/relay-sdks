export type SuppressionReason = 'bounce' | 'complaint';

export interface Suppression {
    id: number;
    created_at: string;
    email: string;
    reason: SuppressionReason;
    description: string | null;
}

export interface ListSuppressionsParams {
    email?: string;
    reason?: SuppressionReason;
}
