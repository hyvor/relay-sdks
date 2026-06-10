import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { WebhookSignatureError } from '../../src/errors';
import { WebhookController } from '../../src/webhooks/controller';
import type { RelayWebhookEvent } from '../../src/webhooks/events';

const SECRET = 'whsec_test_secret';

function sign(secret: string, body: string): string {
    return createHmac('sha256', secret).update(body).digest('hex');
}

const domainCreatedEvent: RelayWebhookEvent = {
    event: 'domain.created',
    domain: {
        id: 1,
        created_at: '2026-01-01T00:00:00Z',
        domain: 'example.com',
        status: 'pending',
        dkim_selector: 'relay',
        dkim_host: 'relay._domainkey.example.com',
        dkim_public_key: 'public-key',
        dkim_txt_value: 'txt-value',
        dkim_checked_at: null,
        dkim_error_message: null,
    },
};

describe('WebhookController', () => {
    describe('on / off / verify', () => {
        it('dispatches verified events to handlers registered for the specific event', async () => {
            const controller = new WebhookController(SECRET);
            const handler = vi.fn();
            controller.on('domain.created', handler);

            const body = JSON.stringify(domainCreatedEvent);
            const event = await controller.verify(body, sign(SECRET, body));

            expect(event).toEqual(domainCreatedEvent);
            expect(handler).toHaveBeenCalledWith(domainCreatedEvent);
        });

        it('dispatches verified events to wildcard handlers', async () => {
            const controller = new WebhookController(SECRET);
            const handler = vi.fn();
            controller.on('*', handler);

            const body = JSON.stringify(domainCreatedEvent);
            await controller.verify(body, sign(SECRET, body));

            expect(handler).toHaveBeenCalledWith(domainCreatedEvent);
        });

        it('does not dispatch to handlers registered for a different event', async () => {
            const controller = new WebhookController(SECRET);
            const handler = vi.fn();
            controller.on('domain.deleted', handler);

            const body = JSON.stringify(domainCreatedEvent);
            await controller.verify(body, sign(SECRET, body));

            expect(handler).not.toHaveBeenCalled();
        });

        it('off() removes a previously registered handler', async () => {
            const controller = new WebhookController(SECRET);
            const handler = vi.fn();
            controller.on('domain.created', handler);
            controller.off('domain.created', handler);

            const body = JSON.stringify(domainCreatedEvent);
            await controller.verify(body, sign(SECRET, body));

            expect(handler).not.toHaveBeenCalled();
        });

        it('off() removes a previously registered wildcard handler', async () => {
            const controller = new WebhookController(SECRET);
            const handler = vi.fn();
            controller.on('*', handler);
            controller.off('*', handler);

            const body = JSON.stringify(domainCreatedEvent);
            await controller.verify(body, sign(SECRET, body));

            expect(handler).not.toHaveBeenCalled();
        });

        it('on() and off() return the controller for chaining', () => {
            const controller = new WebhookController(SECRET);
            const handler = vi.fn();

            expect(controller.on('*', handler)).toBe(controller);
            expect(controller.off('*', handler)).toBe(controller);
        });

        it('verify() throws WebhookSignatureError for an invalid signature without dispatching', async () => {
            const controller = new WebhookController(SECRET);
            const handler = vi.fn();
            controller.on('*', handler);

            const body = JSON.stringify(domainCreatedEvent);

            await expect(controller.verify(body, 'invalid')).rejects.toBeInstanceOf(WebhookSignatureError);
            expect(handler).not.toHaveBeenCalled();
        });

        it('awaits multiple handlers in sequence', async () => {
            const controller = new WebhookController(SECRET);
            const order: string[] = [];
            controller.on('domain.created', async () => {
                order.push('first');
            });
            controller.on('domain.created', async () => {
                order.push('second');
            });

            const body = JSON.stringify(domainCreatedEvent);
            await controller.verify(body, sign(SECRET, body));

            expect(order).toEqual(['first', 'second']);
        });
    });

    describe('handle', () => {
        it('returns 200 OK and dispatches for a valid request', async () => {
            const controller = new WebhookController(SECRET);
            const handler = vi.fn();
            controller.on('domain.created', handler);

            const body = JSON.stringify(domainCreatedEvent);
            const request = new Request('https://example.com/webhook', {
                method: 'POST',
                body,
                headers: { 'X-Signature': sign(SECRET, body) },
            });

            const response = await controller.handle(request);

            expect(response.status).toBe(200);
            expect(handler).toHaveBeenCalledWith(domainCreatedEvent);
        });

        it('returns 401 Unauthorized for an invalid signature', async () => {
            const controller = new WebhookController(SECRET);
            const handler = vi.fn();
            controller.on('*', handler);

            const body = JSON.stringify(domainCreatedEvent);
            const request = new Request('https://example.com/webhook', {
                method: 'POST',
                body,
                headers: { 'X-Signature': 'invalid' },
            });

            const response = await controller.handle(request);

            expect(response.status).toBe(401);
            expect(await response.json()).toEqual({ message: 'Signature does not match' });
            expect(handler).not.toHaveBeenCalled();
        });

        it('returns 401 Unauthorized when the signature header is missing', async () => {
            const controller = new WebhookController(SECRET);

            const body = JSON.stringify(domainCreatedEvent);
            const request = new Request('https://example.com/webhook', { method: 'POST', body });

            const response = await controller.handle(request);

            expect(response.status).toBe(401);
            expect(await response.json()).toEqual({ message: 'Missing X-Signature header' });
        });

        it('rethrows errors that are not signature errors', async () => {
            const controller = new WebhookController(SECRET);

            const body = 'not json';
            const request = new Request('https://example.com/webhook', {
                method: 'POST',
                body,
                headers: { 'X-Signature': sign(SECRET, body) },
            });

            await expect(controller.handle(request)).rejects.toThrow();
        });
    });
});
