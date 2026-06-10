import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { WebhookSignatureError } from '../../src/errors';
import { computeSignature, verifySignature } from '../../src/webhooks/verify-signature';

const SECRET = 'whsec_test_secret';
const BODY = JSON.stringify({ event: 'domain.created', domain: { id: 1 } });

function expectedSignature(secret: string, body: string): string {
    return createHmac('sha256', secret).update(body).digest('hex');
}

describe('computeSignature', () => {
    it('computes the hex-encoded HMAC-SHA256 signature of the body', async () => {
        const signature = await computeSignature(SECRET, BODY);

        expect(signature).toBe(expectedSignature(SECRET, BODY));
        expect(signature).toMatch(/^[0-9a-f]{64}$/);
    });
});

describe('verifySignature', () => {
    it('resolves when the signature matches', async () => {
        const signature = expectedSignature(SECRET, BODY);

        await expect(verifySignature(SECRET, BODY, signature)).resolves.toBeUndefined();
    });

    it('throws WebhookSignatureError when the signature header is missing', async () => {
        await expect(verifySignature(SECRET, BODY, null)).rejects.toBeInstanceOf(WebhookSignatureError);
        await expect(verifySignature(SECRET, BODY, null)).rejects.toThrow('Missing X-Signature header');
    });

    it('throws WebhookSignatureError when the signature header is empty', async () => {
        await expect(verifySignature(SECRET, BODY, '')).rejects.toThrow('Missing X-Signature header');
    });

    it('throws WebhookSignatureError when the signature has a different length', async () => {
        await expect(verifySignature(SECRET, BODY, 'short')).rejects.toThrow('Signature does not match');
    });

    it('throws WebhookSignatureError when the signature does not match', async () => {
        const wrongSignature = expectedSignature('a-different-secret', BODY);

        await expect(verifySignature(SECRET, BODY, wrongSignature)).rejects.toThrow('Signature does not match');
    });
});
