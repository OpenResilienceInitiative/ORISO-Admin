export interface ThemingSeedFields {
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accent?: string | null;
    signal?: string | null;
}

export interface TenantSeeds {
    primary?: string;
    accent?: string;
}

export const readSeeds = (theming?: ThemingSeedFields | null): TenantSeeds => ({
    primary: theming?.primaryColor ?? undefined,
    accent: theming?.accent ?? undefined,
});

export const buildSeedUpdate = (seeds: TenantSeeds): Required<ThemingSeedFields> => ({
    primaryColor: seeds.primary ?? null,
    accent: seeds.accent ?? null,
    secondaryColor: null,
    signal: null,
});
