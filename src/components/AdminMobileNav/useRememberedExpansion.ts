import { useCallback, useState } from 'react';

export const EXPANDED_SECTION_STORAGE_KEY = 'oriso-admin.mobileNav.expandedSection';

/** Marks "the user collapsed everything" — distinct from "never chose". */
const NONE = '';

const read = (): string | null => {
    try {
        return window.localStorage.getItem(EXPANDED_SECTION_STORAGE_KEY);
    } catch {
        return null;
    }
};

const write = (value: string) => {
    try {
        window.localStorage.setItem(EXPANDED_SECTION_STORAGE_KEY, value);
    } catch {
        // Private mode or blocked storage: the menu still works, it just forgets.
    }
};

/**
 * Which category of the mobile menu is expanded, remembered across visits
 * (ORISO-Admin#1319). Only a section key is stored — no personal data.
 *
 * Before the user ever chose, the section they are on is expanded, so the
 * first open shows where they are. Once they chose — including collapsing
 * everything — that choice wins.
 */
export const useRememberedExpansion = (fallbackKey: string | undefined) => {
    const [stored, setStored] = useState<string | null>(read);

    const expandedKey = stored === null ? fallbackKey : stored || undefined;

    const toggle = useCallback(
        (key: string) => {
            const next = expandedKey === key ? NONE : key;

            write(next);
            setStored(next);
        },
        [expandedKey],
    );

    return { expandedKey, toggle };
};
