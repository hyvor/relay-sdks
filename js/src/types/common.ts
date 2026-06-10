/**
 * An email address, either as a plain string (`"jane@example.com"`)
 * or an object with an optional display name.
 */
export type Address = string | { email: string; name?: string };
