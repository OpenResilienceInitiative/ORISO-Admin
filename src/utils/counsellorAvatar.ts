/**
 * Counsellor avatar — the PUBLIC face an advice seeker sees (#995/#1046).
 *
 * Three kinds, one stored pair of fields (`avatarKind` + `avatarId`):
 *
 * - `ICON`     — one of the platform's monochrome counsellor motifs
 *                (`resources/img/svg/avatars`). `avatarId` is the motif id.
 * - `INITIALS` — the counsellor's initials. `avatarId` is unused.
 * - `PICTURE`  — an own uploaded picture. Reserved extension point for
 *                #1048/#1049; the upload path is NOT built here, and this repo
 *                renders the initials fallback until it is.
 *
 * Owner decision 2026-09-17 (binding): initials and motifs BOTH render as a
 * LIGHT glyph on the SATURATED brand red — the same result ORISO-Frontend
 * already shows advice seekers — never on a colour hash. In THIS repo the role
 * that carries that red is `--m3-primary` / `--m3-on-primary`; the app reaches
 * the identical look through `primary-container`, which it resolves to #cc1e1c
 * while this repo resolves it to the pale rose #ffe2de. Tokens either way, so a
 * tenant scheme still moves the avatar (`utils/theme/orisoScheme.ts`).
 */

export const COUNSELLOR_AVATAR_KINDS = ['ICON', 'INITIALS', 'PICTURE'] as const;

export type CounsellorAvatarKind = (typeof COUNSELLOR_AVATAR_KINDS)[number];

/** The stored pair. Both absent = the counsellor never chose — legacy rows stay valid. */
export interface CounsellorAvatarValue {
    avatarKind?: CounsellorAvatarKind | null;
    avatarId?: string | null;
}

/** Kinds the admin form and the wizard offer today (PICTURE arrives with #1048/#1049). */
export const SELECTABLE_AVATAR_KINDS: CounsellorAvatarKind[] = ['INITIALS', 'ICON'];

export const isCounsellorAvatarKind = (value: unknown): value is CounsellorAvatarKind =>
    typeof value === 'string' && (COUNSELLOR_AVATAR_KINDS as readonly string[]).includes(value);

export interface CounsellorNameParts {
    displayName?: string | null;
    firstname?: string | null;
    lastname?: string | null;
    username?: string | null;
}

/**
 * Up to two upper-case letters, read from the PUBLIC display name first — that
 * is the name an advice seeker sees, so the initials must match it. Falls back
 * to first/last name, then the username. Returns '' when nothing is known; the
 * renderer then shows an empty tinted circle rather than a wrong letter.
 */
export const counsellorInitials = ({ displayName, firstname, lastname, username }: CounsellorNameParts): string => {
    const fromDisplayName = (displayName ?? '').trim();
    const words = fromDisplayName ? fromDisplayName.split(/\s+/) : [];
    const candidates = words.length > 0 ? words : [(firstname ?? '').trim(), (lastname ?? '').trim()].filter(Boolean);
    const source = candidates.length > 0 ? candidates : [(username ?? '').trim()].filter(Boolean);

    return source
        .slice(0, 2)
        .map((word) => [...word][0] ?? '')
        .join('')
        .toLocaleUpperCase();
};

/**
 * What to actually paint. A stored `ICON` without an `avatarId`, and the
 * not-yet-implemented `PICTURE`, both degrade to initials instead of rendering
 * an empty hole — "consultants without a choice keep working" (#1046).
 */
export const resolveAvatarKind = ({ avatarKind, avatarId }: CounsellorAvatarValue): 'ICON' | 'INITIALS' =>
    avatarKind === 'ICON' && (avatarId ?? '').trim().length > 0 ? 'ICON' : 'INITIALS';

/**
 * Narrows arbitrary form/API data to the wire pair, dropping an `avatarId` that
 * does not belong to the chosen kind so the backend never stores a motif id
 * behind an INITIALS choice.
 *
 * The cleared id is the EMPTY STRING, not null: the consultant update endpoint
 * reads null/omitted as "leave the stored value untouched" and `''` as "clear
 * it" (the #994 contract). Returning null here would silently keep a previously
 * chosen motif behind an INITIALS pick. An unset/untouched avatar returns `{}`
 * and is therefore omitted from the request entirely.
 */
export const normaliseAvatarValue = (value: CounsellorAvatarValue): CounsellorAvatarValue => {
    if (!isCounsellorAvatarKind(value.avatarKind ?? undefined)) {
        return {};
    }
    if (value.avatarKind !== 'ICON') {
        return { avatarKind: value.avatarKind, avatarId: '' };
    }
    const avatarId = (value.avatarId ?? '').trim();
    return avatarId ? { avatarKind: 'ICON', avatarId } : { avatarKind: 'INITIALS', avatarId: '' };
};
