import type { AdminContrast } from './theme/orisoScheme';

export const ADMIN_TEXT_SCALES = [1, 1.25, 1.5, 2] as const;
export type AdminTextScale = (typeof ADMIN_TEXT_SCALES)[number];
export type AdminSchemeChoice = 'system' | 'light' | 'dark';

export interface AdminDisplayPreferences {
    contrast: AdminContrast;
    schemeChoice: AdminSchemeChoice;
    textScale: AdminTextScale;
}

const STORAGE_KEY = 'oriso-admin.personal-display.v1';
const DEFAULTS: AdminDisplayPreferences = { contrast: 'standard', schemeChoice: 'system', textScale: 1 };

export const readAdminDisplayPreferences = (scope: string | null): AdminDisplayPreferences => {
    if (!scope) return DEFAULTS;

    try {
        const stored = window.sessionStorage.getItem(STORAGE_KEY);
        if (!stored) return DEFAULTS;
        const record = JSON.parse(stored) as (Partial<AdminDisplayPreferences> & { scope?: string }) | null;
        if (record?.scope !== scope) return DEFAULTS;

        return {
            contrast: record.contrast === 'medium' || record.contrast === 'high' ? record.contrast : DEFAULTS.contrast,
            schemeChoice:
                record.schemeChoice === 'light' || record.schemeChoice === 'dark'
                    ? record.schemeChoice
                    : DEFAULTS.schemeChoice,
            textScale: ADMIN_TEXT_SCALES.find((scale) => scale === record.textScale) ?? DEFAULTS.textScale,
        };
    } catch {
        return DEFAULTS;
    }
};

export const writeAdminDisplayPreferences = (scope: string | null, preferences: AdminDisplayPreferences): void => {
    if (!scope) return;
    try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ scope, ...preferences }));
    } catch {
        // Preferences remain usable when the browser has disabled storage.
    }
};
