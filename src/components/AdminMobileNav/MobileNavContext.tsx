import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { M3ConnectedButtonGroupItem } from '../M3ConnectedButtonGroup';

export interface MobileNavRegistration {
    /** Subsections of the page currently rendered, in the order it shows them. */
    subsections?: M3ConnectedButtonGroupItem[];
    /** Route of the subsection the page is on, matched against `subsections`. */
    activeSubsectionKey?: string;
    /** Where "back" leads from this page. Absent on pages you cannot leave. */
    backPath?: string;
    backLabel?: string;
    /** Search of this page, if it has one. Most settings pages do not. */
    search?: { label: string; placeholder?: string; onSearch: (term: string) => void };
    /** Create action of this page, if it has one. Logs and statistics do not. */
    add?: { label: string; onAdd: () => void };
}

interface MobileNavContextValue {
    registration: MobileNavRegistration | null;
    register: (id: string, entry: MobileNavRegistration | null) => void;
}

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

/**
 * Lets the page tell the bottom navigation what it has, without every page
 * having to thread props through the layout.
 *
 * Same shape as {@link CardDeckNavContext}: the page owns its tabs, back target
 * and toolbar actions, the bar just renders them. Only one page is mounted at a
 * time, so the context holds a single entry; a second registration replaces the
 * first and warns in development.
 */
export const MobileNavProvider = ({ children }: { children: ReactNode }) => {
    const [entries, setEntries] = useState<Record<string, MobileNavRegistration>>({});

    // Merged rather than first-wins: a page registers its subsections from the
    // header and its toolbar actions from the toolbar, and the bar needs both.
    const registration = useMemo<MobileNavRegistration | null>(() => {
        const parts = Object.values(entries);

        if (!parts.length) {
            return null;
        }

        return parts.reduce<MobileNavRegistration>((merged, part) => {
            const defined = Object.fromEntries(Object.entries(part).filter(([, field]) => field !== undefined));

            return { ...merged, ...defined };
        }, {});
    }, [entries]);

    // `register` must never change identity: `useRegisterMobileNav` lists it in its
    // effect dependencies, so rebuilding it here (it used to be recreated whenever
    // `registration` changed) made every registration invalidate the callback that had
    // just performed it — an endless register → re-render → register loop that React
    // aborts with "Maximum update depth exceeded" (ORISO-Admin#702).
    const register = useCallback<MobileNavContextValue['register']>((id, entry) => {
        setEntries((current) => {
            if (!entry) {
                if (!(id in current)) {
                    return current;
                }

                const rest = { ...current };

                delete rest[id];

                return rest;
            }

            return { ...current, [id]: entry };
        });
    }, []);

    const value = useMemo<MobileNavContextValue>(() => ({ registration, register }), [registration, register]);

    return <MobileNavContext.Provider value={value}>{children}</MobileNavContext.Provider>;
};

/** The data half of a registration — what a page's identity actually depends on. */
const describe = (entry: MobileNavRegistration | null) =>
    JSON.stringify(
        entry && {
            subsections: entry.subsections,
            activeSubsectionKey: entry.activeSubsectionKey,
            backPath: entry.backPath,
            backLabel: entry.backLabel,
            search: entry.search ? { label: entry.search.label, placeholder: entry.search.placeholder } : undefined,
            add: entry.add ? { label: entry.add.label } : undefined,
        },
    );

/**
 * Publishes this page's subsections, back target and toolbar actions to the
 * bar. Pass `null` to publish nothing — a page without them must clear what the
 * previous one left.
 *
 * Callbacks are read through a ref, so a page that rebuilds its handlers on
 * every render does not re-register in a loop; only the described data above
 * triggers a new registration.
 */
export const useRegisterMobileNav = (id: string, entry: MobileNavRegistration | null) => {
    const context = useContext(MobileNavContext);
    const register = context?.register;
    const latest = useRef(entry);
    const described = describe(entry);

    latest.current = entry;

    useEffect(() => {
        if (!register) {
            return undefined;
        }

        const { current } = latest;

        register(
            id,
            current && {
                ...JSON.parse(described),
                search: current.search
                    ? {
                          label: current.search.label,
                          placeholder: current.search.placeholder,
                          onSearch: (term: string) => latest.current?.search?.onSearch(term),
                      }
                    : undefined,
                add: current.add ? { label: current.add.label, onAdd: () => latest.current?.add?.onAdd() } : undefined,
            },
        );

        return () => register(id, null);
    }, [described, id, register]);
};

/** Read side, for the bar. Without a provider there is simply nothing to show. */
export const useMobileNav = (): MobileNavRegistration | null => useContext(MobileNavContext)?.registration ?? null;
