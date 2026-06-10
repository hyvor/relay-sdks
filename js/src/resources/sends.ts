import type { RequestOptions } from '../config';
import type { Transport } from '../transport';
import type { CreateSendRequest, CreateSendResponse, ListSendsParams, RetrySendRequest, RetrySendResponse, Send } from '../types/send';

export interface SendRequestOptions extends RequestOptions {
    /**
     * A unique key to ensure that retrying this request does not send
     * the email more than once.
     */
    idempotencyKey?: string;
}

/**
 * Send and manage transactional emails.
 */
export class SendsResource {
    constructor(private readonly transport: Transport) {}

    /**
     * Send an email.
     */
    send(data: CreateSendRequest, options?: SendRequestOptions): Promise<CreateSendResponse> {
        return this.transport.request<CreateSendResponse>('POST', '/sends', {
            body: data,
            idempotencyKey: options?.idempotencyKey,
            options,
        });
    }

    /**
     * List sends.
     */
    list(params?: ListSendsParams, options?: RequestOptions): Promise<Send[]> {
        return this.transport.request<Send[]>('GET', '/sends', { query: params, options });
    }

    /**
     * Get a send by its ID.
     */
    get(id: number, options?: RequestOptions): Promise<Send> {
        return this.transport.request<Send>('GET', `/sends/${id}`, { options });
    }

    /**
     * Get a send by its UUID.
     */
    getByUuid(uuid: string, options?: RequestOptions): Promise<Send> {
        return this.transport.request<Send>('GET', `/sends/uuid/${uuid}`, { options });
    }

    /**
     * Retry sending to recipients that previously failed.
     */
    retry(id: number, data?: RetrySendRequest, options?: RequestOptions): Promise<RetrySendResponse> {
        return this.transport.request<RetrySendResponse>('POST', `/sends/${id}/retry`, { body: data ?? {}, options });
    }
}
