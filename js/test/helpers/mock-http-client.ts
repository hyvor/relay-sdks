import type { HttpClient } from '../../src/http-client';

export interface RecordedCall {
    url: string;
    init: RequestInit;
}

export type MockHandler = (url: string, init: RequestInit) => Response | Promise<Response>;

export interface MockHttpClient extends HttpClient {
    calls: RecordedCall[];
}

/**
 * Creates a mock {@link HttpClient} that records every call and
 * delegates to `handler` for the response.
 */
export function createMockHttpClient(handler: MockHandler): MockHttpClient {
    const calls: RecordedCall[] = [];

    return {
        calls,
        async fetch(url, init) {
            calls.push({ url, init });
            return handler(url, init);
        },
    };
}

/**
 * Returns a different response (or throws) for each successive call,
 * repeating the last handler for any extra calls.
 */
export function sequence(...handlers: MockHandler[]): MockHandler {
    let index = 0;

    return (url, init) => {
        const handler = handlers[Math.min(index, handlers.length - 1)]!;
        index++;
        return handler(url, init);
    };
}

export function json(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}): Response {
    return new Response(JSON.stringify(body), {
        status: init.status ?? 200,
        headers: { 'Content-Type': 'application/json', ...init.headers },
    });
}

export function text(body: string, init: { status?: number; headers?: Record<string, string> } = {}): Response {
    return new Response(body, { status: init.status ?? 200, headers: init.headers });
}

export function empty(status = 200): Response {
    return new Response(null, { status });
}

export function networkError(message = 'fetch failed'): MockHandler {
    return () => {
        throw new TypeError(message);
    };
}

/**
 * A response whose headers resolve immediately, but whose body never
 * resolves until the request is aborted. Useful for testing the
 * request (total) timeout.
 */
export function slowBody(status = 200, headers: Record<string, string> = {}): MockHandler {
    return (_url, init) => {
        const response = {
            status,
            headers: new Headers(headers),
            text: () =>
                new Promise<string>((_resolve, reject) => {
                    const signal = init.signal;
                    if (signal?.aborted) {
                        reject(signal.reason);
                        return;
                    }
                    signal?.addEventListener('abort', () => reject(signal.reason));
                }),
        };

        return Promise.resolve(response as unknown as Response);
    };
}

/**
 * A `fetch` call that never settles until the request is aborted.
 * Useful for testing the connect timeout.
 */
export function hangsUntilAborted(): MockHandler {
    return (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
            const signal = init.signal;
            if (signal?.aborted) {
                reject(signal.reason);
                return;
            }
            signal?.addEventListener('abort', () => reject(signal.reason));
        });
}

export function getHeader(init: RequestInit, name: string): string | null {
    return new Headers(init.headers).get(name);
}
