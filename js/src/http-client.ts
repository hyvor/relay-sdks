/**
 * Abstraction over the HTTP client used to make requests to the Relay
 * API. The default implementation uses the global `fetch`. Provide a
 * custom implementation for testing, mocking, or to use a different
 * underlying HTTP library.
 */
export interface HttpClient {
    fetch(url: string, init: RequestInit): Promise<Response>;
}

/**
 * The default {@link HttpClient}, backed by the global `fetch`
 * function available in Node.js, Bun, Deno, browsers and edge runtimes.
 */
export class FetchHttpClient implements HttpClient {
    fetch(url: string, init: RequestInit): Promise<Response> {
        return fetch(url, init);
    }
}
