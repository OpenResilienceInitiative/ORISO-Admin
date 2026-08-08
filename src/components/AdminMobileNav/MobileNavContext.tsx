import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { M3ConnectedButtonGroupItem } from '../M3ConnectedButtonGroup';

export interface MobileNavRegistration {
    /** Subsections of the page currently rendered, in the order it shows them. */
    subsections?: M3ConnectedButtonGroupItem[];
    /** Route of the subsection the page is on, matched against `subsections`. */
    activeSubsectionKey?: string;
    /** Where "back" leads from this page. Absent on pages you cannot leave. */
    backPath?: string;
    backLabel?: string;
}

interface MobileNavContextValue {
    registration: MobileNavRegistration | null;
    register: (id: string, entry: MobileNavRegistration | null) => void;
}

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

/**
 * Lets the page tell the bottom navigation what it has, without every settings
 * page having to thread props through the layout.
 *
 * Same shape as {@link CardDeckNavContext}: the page owns its own tabs and back
 * target, the bar just renders them. Only one page is mounted at a time, so the
 * context holds a single entry; a second registration replaces the first and
 * warns in development.
 */
export const MobileNavProvider = ({ children }: { children: ReactNode }) => {
    const [entries, setEntries] = useState<Record<string, MobileNavRegistration>>({});

    const value = useMemo<MobileNavContextValue>(
        () => ({
            registration: Object.values(entries)[0] ?? null,
            register: (id, entry) =>
                setEntries((current) => {
                    if (!entry) {
                        if (!(id in current)) {
                            return current;
                        }

                        const rest = { ...current };

                        delete rest[id];

                        return rest;
                    }

                    if (process.env.NODE_ENV !== 'production') {
                        const other = Object.keys(current).find((key) => key !== id);

                        if (other) {
                            // eslint-disable-next-line no-console
                            console.warn(
                                'MobileNavProvider: a second page registered its navigation; the bar shows only one.',
                            );
                        }
                    }

                    return { ...current, [id]: entry };
                }),
        }),
        [entries],
    );

    return <MobileNavContext.Provider value={value}>{children}</MobileNavContext.Provider>;
};

/**
 * Publishes this page's subsections and back target to the bar. Pass `null` to
 * publish nothing — a page without tabs must clear what the previous one left.
 */
export const useRegisterMobileNav = (id: string, entry: MobileNavRegistration | null) => {
    const context = useContext(MobileNavContext);
    const register = context?.register;
    // Registrations are plain data; comparing them by value keeps a page that
    // rebuilds its tabs on every render from looping through the provider.
    const serialised = JSON.stringify(entry ?? null);

    useEffect(() => {
        if (!register) {
            return undefined;
        }

        register(id, JSON.parse(serialised) as MobileNavRegistration | null);

        return () => register(id, null);
    }, [id, register, serialised]);
};

/** Read side, for the bar. Without a provider there is simply nothing to show. */
export const useMobileNav = (): MobileNavRegistration | null => useContext(MobileNavContext)?.registration ?? null;
