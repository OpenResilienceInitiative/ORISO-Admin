import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * What a CardDeck publishes so the page header can drive it. The deck stays the
 * owner of its scroll state; the header is a pure remote control.
 */
export interface CardDeckNavRegistration {
    canScrollBackward: boolean;
    canScrollForward: boolean;
    /** id of the scroll container, for `aria-controls` on the header buttons. */
    controlsId: string;
    nextLabel: string;
    previousLabel: string;
    scroll: (direction: -1 | 1) => void;
}

interface CardDeckNavContextValue {
    nav: CardDeckNavRegistration | null;
    register: (id: string, nav: CardDeckNavRegistration) => void;
    unregister: (id: string) => void;
}

const CardDeckNavContext = createContext<CardDeckNavContextValue | null>(null);

/**
 * Bridges the CardDeck (deep inside the page content) and the arrow buttons in
 * the sticky page header, which are siblings without a shared parent state.
 *
 * A page view mounts at most one deck at a time — the several `<CardDeck>` calls
 * in e.g. `pages/Agency/Edit` are alternative branches, never simultaneous — but
 * two decks can overlap for a tick during a route transition, so registrations
 * are kept in order and the most recent one wins.
 */
export const CardDeckNavProvider = ({ children }: { children?: React.ReactNode }) => {
    const [decks, setDecks] = useState<Array<{ id: string; nav: CardDeckNavRegistration }>>([]);

    const register = useCallback((id: string, nav: CardDeckNavRegistration) => {
        setDecks((current) => [...current.filter((entry) => entry.id !== id), { id, nav }]);
    }, []);

    const unregister = useCallback((id: string) => {
        setDecks((current) =>
            current.some((entry) => entry.id === id) ? current.filter((e) => e.id !== id) : current,
        );
    }, []);

    const value = useMemo<CardDeckNavContextValue>(
        () => ({ nav: decks.length ? decks[decks.length - 1].nav : null, register, unregister }),
        [decks, register, unregister],
    );

    return <CardDeckNavContext.Provider value={value}>{children}</CardDeckNavContext.Provider>;
};

/**
 * Publishes a deck's scroll state to the header. Pass `null` to stay
 * unregistered (single-card decks have nothing to scroll). A missing provider is
 * not an error — an isolated deck in Storybook or a unit test simply has no
 * header to drive.
 */
export const useRegisterCardDeckNav = (id: string, nav: CardDeckNavRegistration | null) => {
    const context = useContext(CardDeckNavContext);
    const register = context?.register;
    const unregister = context?.unregister;

    useEffect(() => {
        if (!register || !unregister) {
            return;
        }

        if (nav) {
            register(id, nav);
        } else {
            unregister(id);
        }
    }, [id, nav, register, unregister]);

    useEffect(() => () => unregister?.(id), [id, unregister]);
};

/** Reads the deck currently driving the header, or `null` when there is none. */
export const useCardDeckNav = (): CardDeckNavRegistration | null => useContext(CardDeckNavContext)?.nav ?? null;
