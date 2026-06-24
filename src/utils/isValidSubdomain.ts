/**
 * Subdomain format rule (client-side only).
 *
 * Allows lowercase letters, digits and hyphens; must start and end with an
 * alphanumeric character. Does NOT check availability (no backend endpoint
 * exists for that — uniqueness is enforced server-side via the
 * `X-Reason: SUBDOMAIN_NOT_UNIQUE` response header).
 */
export const SUBDOMAIN_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export const isValidSubdomain = (value: string | null | undefined): boolean => {
    if (value === null || value === undefined || value === '') {
        return true; // emptiness is handled by the separate `required` rule
    }
    return SUBDOMAIN_PATTERN.test(value);
};
