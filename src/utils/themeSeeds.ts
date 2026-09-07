export interface ThemingSeedFields {
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accent?: string | null;
    signal?: string | null;
}

export interface TenantSeeds {
    accentDark?: string;
    accentLight?: string;
    signal?: string;
    /** @deprecated API compatibility alias for accentDark. */
    primary?: string;
    /** @deprecated API compatibility alias for accentLight. */
    accent?: string;
}

export const getAccentDark = (seeds?: TenantSeeds | null): string | undefined => seeds?.accentDark ?? seeds?.primary;

export const getAccentLight = (seeds?: TenantSeeds | null): string | undefined => seeds?.accentLight ?? seeds?.accent;

export const getSignal = (seeds?: TenantSeeds | null): string | undefined => seeds?.signal;

export const readSeeds = (theming?: ThemingSeedFields | null): TenantSeeds => {
    const accentDark = theming?.primaryColor ?? undefined;
    const accentLight = theming?.accent ?? undefined;
    const signal = theming?.signal ?? undefined;

    return {
        accentDark,
        accentLight,
        signal,
        primary: accentDark,
        accent: accentLight,
    };
};

export const buildSeedUpdate = (seeds: TenantSeeds): Required<ThemingSeedFields> => {
    const accentDark = getAccentDark(seeds);
    const accentLight = getAccentLight(seeds);
    const signal = getSignal(seeds);

    return {
        primaryColor: accentDark ?? null,
        accent: accentLight ?? null,
        secondaryColor: null,
        signal: signal ?? null,
    };
};
