# @hyvor/relay

The official JavaScript/TypeScript SDK for [Hyvor Relay](https://relay.hyvor.com), a transactional email
sending service.

- Zero runtime dependencies — built on the standard `fetch`, `Request`/`Response`, and Web Crypto APIs.
- Works on Node.js (>= 20), Bun, Deno, and edge runtimes (Cloudflare Workers, etc.).
- Fully typed requests, responses, and webhook events.

## Installation

```bash
npm install @hyvor/relay
```

```bash
bun add @hyvor/relay
```

## Initialization

Create a `Relay` client with your API key. You can create an API key from your project's settings on
[Hyvor Relay](https://relay.hyvor.com).

```ts
import { Relay } from '@hyvor/relay';

const relay = new Relay({
    apiKey: process.env.RELAY_API_KEY!,
});
```

### Options

| Option              | Type         | Default                     | Description                                                  |
| ------------------- | ------------ | ---------------------------- | ------------------------------------------------------------ |
| `apiKey`            | `string`     | —                             | Your Hyvor Relay API key. Required.                           |
| `baseUrl`           | `string`     | `https://relay.hyvor.com`     | The base URL of the Hyvor Relay API.                          |
| `connectTimeoutMs`  | `number`     | `5000`                        | Max time to wait for a connection to be established.         |
| `requestTimeoutMs`  | `number`     | `10000`                       | Max time to wait for the entire request to complete.         |
| `retry`             | `RetryOptions` | `{ maxAttempts: 3, backoffFactor: 2 }` | Retry behavior for network errors, `429`, and `5xx` responses. |
| `logger`            | `Logger`     | `NoopLogger`                  | A logger for debugging and observability.                     |
| `httpClient`        | `HttpClient` | `FetchHttpClient`             | The HTTP client used to make requests.                        |

Most of these options can also be overridden per request:

```ts
await relay.sends.list(
    { limit: 10 },
    { requestTimeoutMs: 30000, retry: { maxAttempts: 1 } },
);
```

## Sending an email

```ts
const { id, message_id } = await relay.sends.send({
    from: { email: 'you@yourdomain.com', name: 'Your App' },
    to: 'user@example.com',
    subject: 'Welcome!',
    body_html: '<p>Welcome to our app!</p>',
    body_text: 'Welcome to our app!',
});
```

`from`, `to`, `cc`, and `bcc` accept either a plain email string (`"user@example.com"`) or an
`{ email, name? }` object. `to`, `cc`, and `bcc` also accept arrays for multiple recipients.

To prevent an email from being sent more than once if a request is retried, pass an `idempotencyKey`:

```ts
await relay.sends.send(
    { from: 'you@yourdomain.com', to: 'user@example.com', subject: 'Welcome!' },
    { idempotencyKey: 'welcome-email-user-123' },
);
```

Other methods on `relay.sends`:

```ts
await relay.sends.list({ limit: 20, status: 'bounced' });
await relay.sends.get(123);
await relay.sends.getByUuid('a1b2c3...');
await relay.sends.retry(123);
```

## Creating a domain

Sending domains must be verified before you can send emails from them.

```ts
const domain = await relay.domains.create({ domain: 'yourdomain.com' });

console.log(domain.dkim_host, domain.dkim_txt_value);
// Add the DKIM TXT record to your DNS, then verify:

const verified = await relay.domains.verify({ id: domain.id });
console.log(verified.status); // 'pending' | 'active' | 'warning' | 'suspended'
```

Other methods on `relay.domains`:

```ts
await relay.domains.list();
await relay.domains.get({ domain: 'yourdomain.com' });
await relay.domains.delete({ id: domain.id });
```

## Other resources

- `relay.webhooks` — manage webhook endpoints (`list`, `create`, `update`, `delete`, `deliveries`)
- `relay.apiKeys` — manage API keys (`list`, `create`, `update`, `delete`)
- `relay.suppressions` — manage the suppression list (`list`, `delete`)
- `relay.analytics` — read-only analytics (`stats`, `sendsChart`)

## Webhooks

Register a webhook endpoint in the Relay dashboard or via `relay.webhooks.create()`, and use a
`WebhookController` to verify and handle incoming webhook requests. Create one controller per webhook
secret — if you have multiple endpoints with different secrets, create multiple controllers.

```ts
import { WebhookController } from '@hyvor/relay';

const controller = new WebhookController(process.env.RELAY_WEBHOOK_SECRET!);

controller.on('send.recipient.bounced', (event) => {
    console.log('Bounced:', event.recipient.address, event.bounce);
});

controller.on('domain.status.changed', (event) => {
    console.log('Domain status changed:', event.domain.domain, event.domain.status);
});

// Or handle every event with '*':
controller.on('*', (event) => {
    console.log('Received event:', event.event);
});
```

### `.handle()` — Web-standard `Request`/`Response`

For frameworks that use the Web-standard `Request`/`Response` APIs (Bun.serve, Hono, Next.js route
handlers, Cloudflare Workers, Deno, etc.), pass the request directly to `.handle()`. It verifies the
signature, parses the payload, dispatches it to your registered handlers, and returns the response to
send back to Hyvor Relay.

```ts
// Bun.serve
Bun.serve({
    async fetch(request) {
        if (new URL(request.url).pathname === '/webhooks/relay') {
            return controller.handle(request);
        }

        return new Response('Not Found', { status: 404 });
    },
});
```

```ts
// Next.js route handler (app/webhooks/relay/route.ts)
export async function POST(request: Request) {
    return controller.handle(request);
}
```

### `.verify()` — frameworks with raw bodies (e.g. Express)

For frameworks that don't expose a Web-standard `Request`, use `.verify()` with the raw (unparsed)
request body and the `X-Signature` header. It verifies the signature, dispatches the event to your
registered handlers, and returns the parsed event.

```ts
import express from 'express';

const app = express();

app.post('/webhooks/relay', express.text({ type: '*/*' }), async (req, res) => {
    try {
        await controller.verify(req.body, req.header('X-Signature') ?? null);
        res.sendStatus(200);
    } catch (error) {
        res.status(401).json({ message: (error as Error).message });
    }
});
```

## Error handling

All errors thrown by this SDK extend `RelayError`. API errors extend `ApiError`, which carries the
HTTP `status` and the parsed response `body`.

```ts
import {
    ValidationFailedError,
    RateLimitError,
    ServerError,
    ApiError,
    NetworkError,
    RelayError,
} from '@hyvor/relay';

try {
    await relay.sends.send({
        from: 'you@yourdomain.com',
        to: 'user@example.com',
        subject: 'Welcome!',
    });
} catch (error) {
    if (error instanceof ValidationFailedError) {
        // 422 — request validation failed
        console.error(error.errors); // Record<string, string[]>
    } else if (error instanceof RateLimitError) {
        // 429 — too many requests
        console.error('Retry after', error.retryAfter, 'seconds');
    } else if (error instanceof ServerError) {
        // 5xx — something went wrong on our end
        console.error('Server error', error.status);
    } else if (error instanceof ApiError) {
        // any other non-2xx response
        console.error('API error', error.status, error.body);
    } else if (error instanceof NetworkError) {
        // request failed before a response was received (including timeouts)
        console.error('Network error', error.cause);
    } else if (error instanceof RelayError) {
        // base class for all errors thrown by this SDK
        console.error(error);
    }
}
```

`WebhookSignatureError` (also a `RelayError`) is thrown by `WebhookController.verify()` when the
`X-Signature` header is missing or does not match.

## Logging

Pass any logger that implements the `Logger` interface (`debug`, `info`, `warn`, `error`) — this
shape is compatible with popular libraries like `pino` and `winston`. A `ConsoleLogger` is included
for convenience during development:

```ts
import { Relay, ConsoleLogger } from '@hyvor/relay';

const relay = new Relay({
    apiKey: process.env.RELAY_API_KEY!,
    logger: new ConsoleLogger(),
});
```
