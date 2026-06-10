import type { RequestOptions } from '../config';
import type { Transport } from '../transport';
import type { CreateDomainRequest, Domain, DomainIdentifier, ListDomainsParams } from '../types/domain';

/**
 * Manage sending domains.
 */
export class DomainsResource {
    constructor(private readonly transport: Transport) {}

    /**
     * List domains.
     */
    list(params?: ListDomainsParams, options?: RequestOptions): Promise<Domain[]> {
        return this.transport.request<Domain[]>('GET', '/domains', { query: params, options });
    }

    /**
     * Add a new sending domain.
     */
    create(data: CreateDomainRequest, options?: RequestOptions): Promise<Domain> {
        return this.transport.request<Domain>('POST', '/domains', { body: data, options });
    }

    /**
     * Trigger DKIM verification for a domain.
     */
    verify(identifier: DomainIdentifier, options?: RequestOptions): Promise<Domain> {
        return this.transport.request<Domain>('POST', '/domains/verify', { body: identifier, options });
    }

    /**
     * Get a domain by its ID or domain name.
     */
    get(identifier: DomainIdentifier, options?: RequestOptions): Promise<Domain> {
        return this.transport.request<Domain>('GET', '/domains/by', { query: identifier, options });
    }

    /**
     * Delete a domain by its ID or domain name.
     */
    delete(identifier: DomainIdentifier, options?: RequestOptions): Promise<void> {
        return this.transport.request<void>('DELETE', '/domains', { query: identifier, options });
    }
}
