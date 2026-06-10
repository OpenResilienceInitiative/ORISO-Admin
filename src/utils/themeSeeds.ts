/**
 * Tenant theming seed model (THB-03).
 *
 * Only seeds are persisted — the palette is computed by the OrisoScheme
 * engine on use. Storage shape (decided 2026-06-10): flat fields on the
 * existing `theming` object; the legacy `primaryColor` stays the main
 * seed, `accent`/`signal` are added, and the historically mirrored
 * `secondaryColor` is computed-not-stored and therefore cleared.
 */

export interface ThemingSeedFields {
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accent?: string | null;
    signal?: string | null;
}

export interface TenantSeeds {
    primary?: string;
    accent?: string;
    signal?: string;
}

/**
 * Reads the seed set from a stored theming object. A legacy record that
 * only carries `primaryColor` (with or without the mirrored
 * `secondaryColor`) is read as the primary seed.
 */
export const readSeeds = (theming?: ThemingSeedFields | null): TenantSeeds => ({
    primary: theming?.primaryColor ?? undefined,
    accent: theming?.accent ?? undefined,
    signal: theming?.signal ?? undefined,
});

/**
 * Builds the theming update payload for `PUT /service/tenantadmin/{id}`.
 * Seeds only — absent optional seeds and the legacy mirrored
 * `secondaryColor` are cleared with `null` so stale values cannot
 * survive the merge in useTenantAdminDataMutation.
 */
export const buildSeedUpdate = (seeds: TenantSeeds): Required<ThemingSeedFields> => ({
    primaryColor: seeds.primary ?? null,
    accent: seeds.accent ?? null,
    signal: seeds.signal ?? null,
    secondaryColor: null,
});
