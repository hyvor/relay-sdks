import type { WebhookEventName } from '../webhooks/events';

export interface Webhook {
    id: number;
    url: string;
    description: string | null;
    events: WebhookEventName[];

    /**
     * The webhook signing secret. Only present in the response to
     * {@link WebhooksResource.create}.
     */
    secret?: string;
}

export interface CreateWebhookRequest {
    url: string;
    description: string;
    events: WebhookEventName[];
}

export type UpdateWebhookRequest = CreateWebhookRequest;

export type WebhookDeliveryStatus = 'pending' | 'delivered' | 'failed';

export interface WebhookDelivery {
    id: number;
    created_at: string;
    url: string;
    event: string;
    status: WebhookDeliveryStatus;
    response: string | null;
}

export interface ListWebhookDeliveriesParams {
    webhook_id?: number;
}
