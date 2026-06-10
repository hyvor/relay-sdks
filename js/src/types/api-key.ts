export type ApiKeyScope =
    | 'sends.read'
    | 'sends.send'
    | 'domains.read'
    | 'domains.write'
    | 'webhooks.read'
    | 'webhooks.write'
    | 'api_keys.read'
    | 'api_keys.write'
    | 'suppressions.read'
    | 'suppressions.write'
    | 'analytics.read';

export interface ApiKey {
    id: number;
    name: string;
    scopes: ApiKeyScope[];

    /**
     * The raw API key. Only present in the response to {@link ApiKeysResource.create}.
     */
    key?: string;
    created_at: string;
    is_enabled: boolean;
    last_accessed_at: string | null;
}

export interface CreateApiKeyRequest {
    name: string;
    scopes: ApiKeyScope[];
}

export interface UpdateApiKeyRequest {
    name?: string;
    is_enabled?: boolean;
    scopes?: ApiKeyScope[];
}
