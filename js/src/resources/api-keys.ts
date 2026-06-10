import type { RequestOptions } from '../config';
import type { Transport } from '../transport';
import type { ApiKey, CreateApiKeyRequest, UpdateApiKeyRequest } from '../types/api-key';

/**
 * Manage API keys for your project.
 */
export class ApiKeysResource {
    constructor(private readonly transport: Transport) {}

    /**
     * List API keys.
     */
    list(options?: RequestOptions): Promise<ApiKey[]> {
        return this.transport.request<ApiKey[]>('GET', '/api-keys', { options });
    }

    /**
     * Create an API key. The raw key is only returned in this response.
     */
    create(data: CreateApiKeyRequest, options?: RequestOptions): Promise<ApiKey> {
        return this.transport.request<ApiKey>('POST', '/api-keys', { body: data, options });
    }

    /**
     * Update an API key.
     */
    update(id: number, data: UpdateApiKeyRequest, options?: RequestOptions): Promise<ApiKey> {
        return this.transport.request<ApiKey>('PATCH', `/api-keys/${id}`, { body: data, options });
    }

    /**
     * Delete an API key.
     */
    delete(id: number, options?: RequestOptions): Promise<void> {
        return this.transport.request<void>('DELETE', `/api-keys/${id}`, { options });
    }
}
