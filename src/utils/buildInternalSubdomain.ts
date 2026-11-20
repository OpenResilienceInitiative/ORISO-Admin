const SUFFIX_LENGTH = 6;

/** A fresh suffix; hold on to it where the same value must come out again (a form that rebuilds it). */
export const newInternalSubdomainSuffix = () => Date.now().toString().slice(-SUFFIX_LENGTH);

/**
 * A technical subdomain the Träger never picked: the name as a slug plus a numeric suffix, e.g.
 * `caritas-nord-123456`. It always matches the TenantService format (`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`),
 * and the suffix keeps it unique where TenantService refuses a taken subdomain.
 */
export const buildInternalSubdomain = (name?: string, suffix: string = newInternalSubdomainSuffix()) => {
    const base =
        (name || 'tenant')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 24)
            .replace(/-+$/g, '') || 'tenant';
    return `${base}-${suffix}`;
};
