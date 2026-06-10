import type { RequestOptions } from '../config';
import type { Transport } from '../transport';
import type { ListSuppressionsParams, Suppression } from '../types/suppression';

/**
 * Manage the suppression list (bounced and complained recipients that
 * are automatically excluded from future sends).
 */
export class SuppressionsResource {
    constructor(private readonly transport: Transport) {}

    /**
     * List suppressions.
     */
    list(params?: ListSuppressionsParams, options?: RequestOptions): Promise<Suppression[]> {
        return this.transport.request<Suppression[]>('GET', '/suppressions', { query: params, options });
    }

    /**
     * Remove an address from the suppression list.
     */
    delete(id: number, options?: RequestOptions): Promise<void> {
        return this.transport.request<void>('DELETE', `/suppressions/${id}`, { options });
    }
}
