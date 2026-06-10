import { describe, expect, it } from 'vitest';
import { Relay } from '../src/index';
import { AnalyticsResource } from '../src/resources/analytics';
import { ApiKeysResource } from '../src/resources/api-keys';
import { DomainsResource } from '../src/resources/domains';
import { SendsResource } from '../src/resources/sends';
import { SuppressionsResource } from '../src/resources/suppressions';
import { WebhooksResource } from '../src/resources/webhooks';

describe('Relay', () => {
    it('wires up all resources sharing a single transport', () => {
        const relay = new Relay({ apiKey: 'test-key' });

        expect(relay.sends).toBeInstanceOf(SendsResource);
        expect(relay.domains).toBeInstanceOf(DomainsResource);
        expect(relay.webhooks).toBeInstanceOf(WebhooksResource);
        expect(relay.apiKeys).toBeInstanceOf(ApiKeysResource);
        expect(relay.suppressions).toBeInstanceOf(SuppressionsResource);
        expect(relay.analytics).toBeInstanceOf(AnalyticsResource);
    });
});
