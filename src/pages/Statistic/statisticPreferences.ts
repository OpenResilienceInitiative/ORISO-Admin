import { parseUserAuthInfo } from '../../utils/parseUserAuthInfo';
import { cardMenuKeys, scopeOrder } from './statisticConstants';
import type { CardMenuKey, SelectedCardMenuByScope } from './types';

const statisticPreferenceStorageBaseKey = 'oriso.admin.statistics.metricPreferences.v1';
const legacyStatisticPreferenceStorageKey = statisticPreferenceStorageBaseKey;

const createDefaultCardMenuSelection = (): SelectedCardMenuByScope => ({
    platform: {},
    tenant: {},
    agency: {},
});

const isCardMenuKey = (value: unknown): value is CardMenuKey =>
    typeof value === 'string' && cardMenuKeys.includes(value as CardMenuKey);

const getStatisticPreferenceStorageKey = () => {
    const authInfo = parseUserAuthInfo() as {
        email?: string;
        id?: number | string | null;
        sub?: string;
        username?: string;
    };
    const userKey = authInfo.id || authInfo.username || authInfo.email || authInfo.sub || 'anonymous-preview';

    return `${statisticPreferenceStorageBaseKey}.${userKey}`;
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
