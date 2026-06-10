import type { Domain } from '../types/domain';
import type { Bounce, Send, SendAttempt, SendRecipient } from '../types/send';
import type { Suppression } from '../types/suppression';

/**
 * The names of all events that can be subscribed to via webhooks.
 */
export type WebhookEventName =
    | 'send.recipient.accepted'
    | 'send.recipient.deferred'
    | 'send.recipient.bounced'
    | 'send.recipient.complained'
    | 'send.recipient.failed'
    | 'send.recipient.suppressed'
    | 'domain.created'
    | 'domain.status.changed'
    | 'domain.deleted'
    | 'suppression.created'
    | 'suppression.deleted';

interface SendRecipientEvent<E extends WebhookEventName> {
    event: E;
    send: Send;
    recipient: SendRecipient;
    attempt: SendAttempt | null;
}

export type SendRecipientAcceptedEvent = SendRecipientEvent<'send.recipient.accepted'>;
export type SendRecipientDeferredEvent = SendRecipientEvent<'send.recipient.deferred'>;
export type SendRecipientComplainedEvent = SendRecipientEvent<'send.recipient.complained'>;
export type SendRecipientFailedEvent = SendRecipientEvent<'send.recipient.failed'>;
export type SendRecipientSuppressedEvent = SendRecipientEvent<'send.recipient.suppressed'>;

export type SendRecipientBouncedEvent = SendRecipientEvent<'send.recipient.bounced'> & {
    bounce: Bounce;
};

interface DomainEvent<E extends WebhookEventName> {
    event: E;
    domain: Domain;
}

export type DomainCreatedEvent = DomainEvent<'domain.created'>;
export type DomainStatusChangedEvent = DomainEvent<'domain.status.changed'>;
export type DomainDeletedEvent = DomainEvent<'domain.deleted'>;

interface SuppressionEvent<E extends WebhookEventName> {
    event: E;
    suppression: Suppression;
}

export type SuppressionCreatedEvent = SuppressionEvent<'suppression.created'>;
export type SuppressionDeletedEvent = SuppressionEvent<'suppression.deleted'>;

/**
 * A discriminated union of all webhook event payloads, keyed by the
 * `event` field.
 */
export type RelayWebhookEvent =
    | SendRecipientAcceptedEvent
    | SendRecipientDeferredEvent
    | SendRecipientBouncedEvent
    | SendRecipientComplainedEvent
    | SendRecipientFailedEvent
    | SendRecipientSuppressedEvent
    | DomainCreatedEvent
    | DomainStatusChangedEvent
    | DomainDeletedEvent
    | SuppressionCreatedEvent
    | SuppressionDeletedEvent;
