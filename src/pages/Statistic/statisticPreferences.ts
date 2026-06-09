import { parseUserAuthInfo } from '../../utils/parseUserAuthInfo';
import { cardMenuKeys, defaultSelectedFilterTargetIdsByScope, scopeOrder } from './statisticConstants';
import type { CardMenuKey, SelectedCardMenuByScope, SelectedFilterTargetIdsByScope } from './types';

const statisticPreferenceStorageBaseKey = 'oriso.admin.statistics.metricPreferences.v1';
const statisticFilterPreferenceStorageBaseKey = 'oriso.admin.statistics.filterPreferences.v3';
const legacyStatisticPreferenceStorageKey = statisticPreferenceStorageBaseKey;

const createDefaultCardMenuSelection = (): SelectedCardMenuByScope => ({
    platform: {},
    tenant: {},
    agency: {},
});

const isCardMenuKey = (value: unknown): value is CardMenuKey =>
    typeof value === 'string' && cardMenuKeys.includes(value as CardMenuKey);

const getStatisticPreferenceStorageKey = (baseKey = statisticPreferenceStorageBaseKey) => {
    const authInfo = parseUserAuthInfo() as {
        email?: string;
        id?: number | string | null;
        sub?: string;
        username?: string;
    };
    const userKey = authInfo.id || authInfo.username || authInfo.email || authInfo.sub || 'anonymous-preview';

    return `${baseKey}.${userKey}`;
};

export const readStoredCardMenuSelection = (): SelectedCardMenuByScope => {
    const fallbackSelection = createDefaultCardMenuSelection();

    if (typeof window === 'undefined') {
        return fallbackSelection;
    }

    try {
        const storedValue =
            window.localStorage.getItem(getStatisticPreferenceStorageKey()) ||
            window.localStorage.getItem(legacyStatisticPreferenceStorageKey);

        if (!storedValue) {
            return fallbackSelection;
        }

        const parsedValue = JSON.parse(storedValue) as Record<string, Record<string, unknown>>;

        return scopeOrder.reduce<SelectedCardMenuByScope>((selection, scopeKey) => {
            const storedScopeSelection = parsedValue[scopeKey];

            if (!storedScopeSelection || typeof storedScopeSelection !== 'object') {
                return selection;
            }

            const sanitizedScopeSelection = Object.entries(storedScopeSelection).reduce<Record<string, CardMenuKey>>(
                (cardSelection, [cardKey, menuKey]) => {
                    if (!isCardMenuKey(menuKey)) {
                        return cardSelection;
                    }

                    return {
                        ...cardSelection,
                        [cardKey]: menuKey,
                    };
                },
                {},
            );

            return {
                ...selection,
                [scopeKey]: sanitizedScopeSelection,
            };
        }, fallbackSelection);
    } catch {
        return fallbackSelection;
    }
};

export const storeCardMenuSelection = (selection: SelectedCardMenuByScope) => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(getStatisticPreferenceStorageKey(), JSON.stringify(selection));
    } catch {
        // Preferences are nice-to-have in the preview; the dashboard still works without storage access.
    }
};

export const readStoredFilterTargetSelection = (): SelectedFilterTargetIdsByScope => {
    const fallbackSelection = defaultSelectedFilterTargetIdsByScope;

    if (typeof window === 'undefined') {
        return fallbackSelection;
    }

    try {
        const storedValue = window.localStorage.getItem(
            getStatisticPreferenceStorageKey(statisticFilterPreferenceStorageBaseKey),
        );

        if (!storedValue) {
            return fallbackSelection;
        }

        const parsedValue = JSON.parse(storedValue) as Record<string, unknown>;

        return scopeOrder.reduce<SelectedFilterTargetIdsByScope>((selection, scopeKey) => {
            const storedScopeSelection = parsedValue[scopeKey];

            if (!Array.isArray(storedScopeSelection)) {
                return selection;
            }

            return {
                ...selection,
                [scopeKey]: storedScopeSelection.filter((targetId): targetId is string => typeof targetId === 'string'),
            };
        }, fallbackSelection);
    } catch {
        return fallbackSelection;
    }
};

export const storeFilterTargetSelection = (selection: SelectedFilterTargetIdsByScope) => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(
            getStatisticPreferenceStorageKey(statisticFilterPreferenceStorageBaseKey),
            JSON.stringify(selection),
        );
    } catch {
        // Filter preferences are a preview convenience and should not block the dashboard.
    }
};
