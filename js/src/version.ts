declare const __PACKAGE_VERSION__: string | undefined;

/**
 * The SDK version, injected at build time from package.json.
 * Falls back to "0.0.0-dev" when running from source (e.g. tests).
 */
export const VERSION = typeof __PACKAGE_VERSION__ !== 'undefined' ? __PACKAGE_VERSION__ : '0.0.0-dev';

export const USER_AGENT = `hyvor/relay-js/${VERSION}`;
