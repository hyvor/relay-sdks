import type { Address } from './common';

export type SendRecipientType = 'to' | 'cc' | 'bcc';

export type SendRecipientStatus =
    | 'queued'
    | 'accepted'
    | 'deferred'
    | 'bounced'
    | 'complained'
    | 'suppressed'
    | 'failed';

export type SendAttemptStatus = 'accepted' | 'deferred' | 'bounced' | 'failed';

export interface SendRecipient {
    id: number;
    type: SendRecipientType;
    address: string;
    name: string | null;
    status: SendRecipientStatus;
    try_count: number;
}

export interface SendAttempt {
    id: number;
    created_at: string;
    status: SendAttemptStatus;
    try_count: number;
    resolved_mx_hosts: string[];
    responded_mx_host: string | null;
    smtp_conversations: string;
    recipient_ids: number[];
    duration_ms: number;
    error: string | null;
}

/**
 * Feedback (e.g. bounce/complaint reports) received for a send. The
 * Relay API does not document a fixed schema for feedback entries, so
 * this type is intentionally loose.
 */
export type SendFeedback = Record<string, unknown>;

/**
 * Details about a bounce, included in `send.recipient.bounced`
 * webhook events. The Relay API does not document the exact shape, so
 * this type is intentionally loose.
 */
export interface Bounce {
    type?: string;
    message?: string;
    [key: string]: unknown;
}

export interface Send {
    id: number;
    uuid: string;
    created_at: string;
    from_address: string;
    from_name: string | null;
    subject: string | null;
    body_html: string | null;
    body_text: string | null;
    headers: Record<string, string>;
    raw: string | null;
    queued: boolean;
    send_after: number | null;
    recipients: SendRecipient[];
    attempts: SendAttempt[];
    feedback: SendFeedback[];
}

export interface SendAttachment {
    /**
     * The base64-encoded content of the attachment.
     */
    content: string;
    name?: string;
    content_type?: string;
}

export interface CreateSendRequest {
    from: Address;
    to: Address | Address[];
    cc?: Address | Address[];
    bcc?: Address | Address[];
    subject?: string;
    body_html?: string;
    body_text?: string;
    headers?: Record<string, string>;
    attachments?: SendAttachment[];
}

export interface CreateSendResponse {
    id: number;
    message_id: string;
}

export interface ListSendsParams {
    /**
     * @default 50
     */
    limit?: number;
    before_id?: number;
    status?: SendRecipientStatus;
    from_search?: string;
    to_search?: string;
}

export interface RetrySendRequest {
    /**
     * A unix timestamp to delay the retry until.
     */
    send_after?: number;
}

export interface RetrySendResponse {
    retried_recipients: number;
}
