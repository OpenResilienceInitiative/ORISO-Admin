/**
 * A counsellor's public contact-link name (ORISO-UserService#1534): lowercase letters and digits
 * in segments joined by single hyphens, e.g. `qa-shazia-2810`. Mirrors the UserService rule
 * (`PublicSlugFormat`), which stays the authority.
 */
export const PUBLIC_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Shapes Java's `UUID.fromString` accepts: five hex groups, at most 36 characters. The UserService
 * looks names up as consultant ids first and therefore rejects such names (`1-2-3-4-5`), because
 * their link could never be opened.
 */
const UUID_SHAPED = /^[0-9a-f]+(-[0-9a-f]+){4}$/;

const looksLikeConsultantId = (slug: string): boolean => slug.length <= 36 && UUID_SHAPED.test(slug);

export const isValidPublicSlug = (slug: string): boolean =>
    PUBLIC_SLUG_PATTERN.test(slug) && !looksLikeConsultantId(slug);

/**
 * The link advice seekers open: the counselling app resolves `/registration?cid=<name or id>`
 * (ORISO-Frontend `ConsultantInformation`). Built from APP_URL like every other advice-seeker
 * link the admin hands out. Returns null when either part is missing, so nothing half-built
 * is shown.
 */
export const buildPublicContactLinkUrl = (slug: string | undefined | null, baseUrl: string): string | null => {
    const name = slug?.trim();
    const base = baseUrl?.trim().replace(/\/+$/, '');
    if (!name || !base) return null;
    return `${base}/registration?cid=${encodeURIComponent(name)}`;
};
