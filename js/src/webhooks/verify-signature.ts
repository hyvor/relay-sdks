import { WebhookSignatureError } from '../errors';

/**
 * Computes the hex-encoded HMAC-SHA256 signature of `body` using
 * `secret`.
 */
export async function computeSignature(secret: string, body: string): Promise<string> {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
        'sign',
    ]);

    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));

    return Array.from(new Uint8Array(signature))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Verifies that `signature` (the value of the `X-Signature` header)
 * matches the HMAC-SHA256 signature of `body` computed using the
 * webhook's `secret`.
 *
 * @throws {WebhookSignatureError} if the signature is missing or does not match.
 */
export async function verifySignature(secret: string, body: string, signature: string | null): Promise<void> {
    if (!signature) {
        throw new WebhookSignatureError('Missing X-Signature header');
    }

    const expected = await computeSignature(secret, body);

    if (!timingSafeEqual(expected, signature)) {
        throw new WebhookSignatureError('Signature does not match');
    }
}

/**
 * Compares two strings in constant time to avoid leaking information
 * via timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }

    let mismatch = 0;
    for (let i = 0; i < a.length; i++) {
        mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return mismatch === 0;
}
