export type DomainStatus = 'pending' | 'active' | 'warning' | 'suspended';

export interface Domain {
    id: number;
    created_at: string;
    domain: string;
    status: DomainStatus;
    dkim_selector: string;
    dkim_host: string;
    dkim_public_key: string;
    dkim_txt_value: string;
    dkim_checked_at: string | null;
    dkim_error_message: string | null;
}

export interface CreateDomainRequest {
    /**
     * The domain name. Must be unique.
     */
    domain: string;
    dkim_selector?: string;
    dkim_private_key?: string;
}

export interface ListDomainsParams {
    /**
     * @default 50
     */
    limit?: number;

    /**
     * @default 0
     */
    offset?: number;
    search?: string;
}

/**
 * Identifies a domain either by its numeric ID or its domain name.
 */
export type DomainIdentifier = { id: number } | { domain: string };
