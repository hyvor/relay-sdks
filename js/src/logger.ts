/**
 * A logger that can be injected into the {@link Relay} client for
 * debugging and observability. Compatible with most popular logging
 * libraries (e.g. `pino`, `winston`) which already implement this shape.
 */
export interface Logger {
    debug(message: string, context?: Record<string, unknown>): void;
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(message: string, context?: Record<string, unknown>): void;
}

/**
 * The default logger used by the {@link Relay} client. Discards all
 * messages.
 */
export class NoopLogger implements Logger {
    debug(): void {}
    info(): void {}
    warn(): void {}
    error(): void {}
}

/**
 * A {@link Logger} implementation that writes to the console. Useful
 * for local development and debugging.
 */
export class ConsoleLogger implements Logger {
    debug(message: string, context?: Record<string, unknown>): void {
        console.debug(`[hyvor/relay] ${message}`, context ?? '');
    }

    info(message: string, context?: Record<string, unknown>): void {
        console.info(`[hyvor/relay] ${message}`, context ?? '');
    }

    warn(message: string, context?: Record<string, unknown>): void {
        console.warn(`[hyvor/relay] ${message}`, context ?? '');
    }

    error(message: string, context?: Record<string, unknown>): void {
        console.error(`[hyvor/relay] ${message}`, context ?? '');
    }
}
