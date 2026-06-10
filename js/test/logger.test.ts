import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsoleLogger, type Logger, NoopLogger } from '../src/logger';

describe('NoopLogger', () => {
    it('discards all messages', () => {
        const logger: Logger = new NoopLogger();

        expect(logger.debug('debug')).toBeUndefined();
        expect(logger.info('info')).toBeUndefined();
        expect(logger.warn('warn')).toBeUndefined();
        expect(logger.error('error')).toBeUndefined();
    });
});

describe('ConsoleLogger', () => {
    beforeEach(() => {
        vi.spyOn(console, 'debug').mockImplementation(() => {});
        vi.spyOn(console, 'info').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('writes messages to the console with a prefix', () => {
        const logger = new ConsoleLogger();

        logger.debug('debug message');
        logger.info('info message');
        logger.warn('warn message');
        logger.error('error message');

        expect(console.debug).toHaveBeenCalledWith('[hyvor/relay] debug message', '');
        expect(console.info).toHaveBeenCalledWith('[hyvor/relay] info message', '');
        expect(console.warn).toHaveBeenCalledWith('[hyvor/relay] warn message', '');
        expect(console.error).toHaveBeenCalledWith('[hyvor/relay] error message', '');
    });

    it('includes the context object when provided', () => {
        const logger = new ConsoleLogger();
        const context = { attempt: 1 };

        logger.debug('debug message', context);
        logger.info('info message', context);
        logger.warn('warn message', context);
        logger.error('error message', context);

        expect(console.debug).toHaveBeenCalledWith('[hyvor/relay] debug message', context);
        expect(console.info).toHaveBeenCalledWith('[hyvor/relay] info message', context);
        expect(console.warn).toHaveBeenCalledWith('[hyvor/relay] warn message', context);
        expect(console.error).toHaveBeenCalledWith('[hyvor/relay] error message', context);
    });
});
