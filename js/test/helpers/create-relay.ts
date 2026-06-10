import { Relay, type RelayOptions } from '../../src/index';
import { createMockHttpClient, type MockHandler, type MockHttpClient } from './mock-http-client';

/**
 * Creates a {@link Relay} client backed by a mock {@link HttpClient},
 * for testing resource methods against the real {@link Transport}.
 */
export function createTestRelay(
    handler: MockHandler,
    options: Partial<RelayOptions> = {},
): { relay: Relay; mock: MockHttpClient } {
    const mock = createMockHttpClient(handler);
    const relay = new Relay({
        apiKey: 'test-key',
        retry: { maxAttempts: 1 },
        ...options,
        httpClient: mock,
    });

    return { relay, mock };
}
