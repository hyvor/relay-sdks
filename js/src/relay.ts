import { resolveOptions, type RelayOptions } from './config';
import { AnalyticsResource } from './resources/analytics';
import { ApiKeysResource } from './resources/api-keys';
import { DomainsResource } from './resources/domains';
import { SendsResource } from './resources/sends';
import { SuppressionsResource } from './resources/suppressions';
import { WebhooksResource } from './resources/webhooks';
import { Transport } from './transport';

/**
 * The Hyvor Relay API client.
 *
 * @example
 * ```ts
 * const relay = new Relay({ apiKey: process.env.RELAY_API_KEY! });
 *
 * await relay.sends.send({
 *     from: 'you@example.com',
 *     to: 'user@example.com',
 *     subject: 'Hello',
 *     body_text: 'Hello, world!',
 * });
 * ```
 */
export class Relay {
    /**
     * Send and manage transactional emails.
     */
    readonly sends: SendsResource;

    /**
     * Manage sending domains.
     */
    readonly domains: DomainsResource;

    /**
     * Manage webhook endpoints.
     */
    readonly webhooks: WebhooksResource;

    /**
     * Manage API keys.
     */
    readonly apiKeys: ApiKeysResource;

    /**
     * Manage the suppression list.
     */
    readonly suppressions: SuppressionsResource;

    /**
     * Read-only analytics.
     */
    readonly analytics: AnalyticsResource;

    constructor(options: RelayOptions) {
        const transport = new Transport(resolveOptions(options));

        this.sends = new SendsResource(transport);
        this.domains = new DomainsResource(transport);
        this.webhooks = new WebhooksResource(transport);
        this.apiKeys = new ApiKeysResource(transport);
        this.suppressions = new SuppressionsResource(transport);
        this.analytics = new AnalyticsResource(transport);
    }
}
