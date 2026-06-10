import { WebhookSignatureError } from '../errors';
import type { RelayWebhookEvent, WebhookEventName } from './events';
import { verifySignature } from './verify-signature';

type EventHandler<E extends RelayWebhookEvent = RelayWebhookEvent> = (event: E) => void | Promise<void>;

/**
 * Verifies and handles incoming Hyvor Relay webhook requests.
 *
 * Create one controller per webhook secret. If you have multiple
 * webhook endpoints (e.g. with different secrets), create multiple
 * controllers and wire each one up to its own route.
 *
 * @example
 * ```ts
 * const controller = new WebhookController(process.env.RELAY_WEBHOOK_SECRET!);
 *
 * controller.on('send.recipient.bounced', (event) => {
 *     console.log('Bounced:', event.recipient.address);
 * });
 *
 * // Web-standard Request/Response (Bun.serve, Hono, Next.js route handlers, ...)
 * export async function POST(request: Request) {
 *     return controller.handle(request);
 * }
 * ```
 */
export class WebhookController {
    private readonly handlers = new Map<string, Set<EventHandler>>();

    constructor(private readonly secret: string) {}

    /**
     * Register a handler for a specific event, or `'*'` to handle all
     * events.
     */
    on<E extends WebhookEventName>(event: E, handler: EventHandler<Extract<RelayWebhookEvent, { event: E }>>): this;
    on(event: '*', handler: EventHandler): this;
    on(event: string, handler: EventHandler<never>): this {
        let handlers = this.handlers.get(event);

        if (!handlers) {
            handlers = new Set();
            this.handlers.set(event, handlers);
        }

        handlers.add(handler as EventHandler);

        return this;
    }

    /**
     * Remove a previously registered handler.
     */
    off<E extends WebhookEventName>(event: E, handler: EventHandler<Extract<RelayWebhookEvent, { event: E }>>): this;
    off(event: '*', handler: EventHandler): this;
    off(event: string, handler: EventHandler<never>): this {
        this.handlers.get(event)?.delete(handler as EventHandler);
        return this;
    }

    /**
     * Verifies the signature of a webhook payload, parses it, and
     * dispatches it to any handlers registered with {@link on}.
     *
     * Use this for frameworks that don't expose a Web-standard
     * `Request`/`Response` (e.g. Express): pass the raw (unparsed)
     * request body and the value of the `X-Signature` header.
     *
     * @throws {WebhookSignatureError} if the signature is missing or does not match.
     */
    async verify(rawBody: string, signature: string | null): Promise<RelayWebhookEvent> {
        await verifySignature(this.secret, rawBody, signature);

        const event = JSON.parse(rawBody) as RelayWebhookEvent;
        await this.dispatch(event);

        return event;
    }

    /**
     * Verifies and handles a webhook request using the Web-standard
     * `Request`/`Response` APIs (supported by Bun.serve, Hono,
     * Next.js route handlers, Cloudflare Workers, Deno, etc.).
     *
     * Returns a `401 Unauthorized` response if the signature is
     * missing or invalid, and a `200 OK` response otherwise.
     */
    async handle(request: Request): Promise<Response> {
        const rawBody = await request.text();

        try {
            await this.verify(rawBody, request.headers.get('X-Signature'));
        } catch (error) {
            if (error instanceof WebhookSignatureError) {
                return new Response(JSON.stringify({ message: error.message }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            throw error;
        }

        return new Response(null, { status: 200 });
    }

    private async dispatch(event: RelayWebhookEvent): Promise<void> {
        const handlers = [...(this.handlers.get(event.event) ?? []), ...(this.handlers.get('*') ?? [])];

        for (const handler of handlers) {
            await handler(event);
        }
    }
}
