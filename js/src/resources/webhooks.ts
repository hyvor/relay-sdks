import type { RequestOptions } from '../config';
import type { Transport } from '../transport';
import type {
    CreateWebhookRequest,
    ListWebhookDeliveriesParams,
    UpdateWebhookRequest,
    Webhook,
    WebhookDelivery,
} from '../types/webhook';

/**
 * Manage webhook endpoints registered on your project.
 *
 * To verify and handle incoming webhook requests, see {@link WebhookController}.
 */
export class WebhooksResource {
    constructor(private readonly transport: Transport) {}

    /**
     * List webhooks.
     */
    list(options?: RequestOptions): Promise<Webhook[]> {
        return this.transport.request<Webhook[]>('GET', '/webhooks', { options });
    }

    /**
     * Create a webhook.
     */
    create(data: CreateWebhookRequest, options?: RequestOptions): Promise<Webhook> {
        return this.transport.request<Webhook>('POST', '/webhooks', { body: data, options });
    }

    /**
     * Update a webhook.
     */
    update(id: number, data: UpdateWebhookRequest, options?: RequestOptions): Promise<Webhook> {
        return this.transport.request<Webhook>('PATCH', `/webhooks/${id}`, { body: data, options });
    }

    /**
     * Delete a webhook.
     */
    delete(id: number, options?: RequestOptions): Promise<void> {
        return this.transport.request<void>('DELETE', `/webhooks/${id}`, { options });
    }

    /**
     * List webhook delivery attempts.
     */
    deliveries(params?: ListWebhookDeliveriesParams, options?: RequestOptions): Promise<WebhookDelivery[]> {
        return this.transport.request<WebhookDelivery[]>('GET', '/webhooks/deliveries', { query: params, options });
    }
}
