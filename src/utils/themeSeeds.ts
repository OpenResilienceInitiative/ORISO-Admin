export interface ThemingSeedFields {
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accent?: string | null;
    signal?: string | null;
}

export interface TenantSeeds {
    accentDark?: string;
    accentLight?: string;
    /** @deprecated API compatibility alias for accentDark. */
    primary?: string;
    /** @deprecated API compatibility alias for accentLight. */
    accent?: string;
}

export const getAccentDark = (seeds?: TenantSeeds | null): string | undefined => seeds?.accentDark ?? seeds?.primary;

export const getAccentLight = (seeds?: TenantSeeds | null): string | undefined => seeds?.accentLight ?? seeds?.accent;

export const readSeeds = (theming?: ThemingSeedFields | null): TenantSeeds => {
    const accentDark = theming?.primaryColor ?? undefined;
    const accentLight = theming?.accent ?? undefined;

    return {
        accentDark,
        accentLight,
        primary: accentDark,
        accent: accentLight,
    };
};

export const buildSeedUpdate = (seeds: TenantSeeds): Required<ThemingSeedFields> => {
    const accentDark = getAccentDark(seeds);
    const accentLight = getAccentLight(seeds);

    return {
        primaryColor: accentDark ?? null,
        accent: accentLight ?? null,
        secondaryColor: null,
        signal: null,
    };
};
