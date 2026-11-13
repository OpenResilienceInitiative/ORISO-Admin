import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AdminSidebarNavItem } from '../Layout/AdminSidebar';
import type { AdminNavSubsection } from '../Layout/adminNavTree';
import { AdminSearchView, type ListGroup } from './AdminSearchView';
import routePathNames from '../../appConfig';
import { listPathWithQuery } from '../../hooks/useListQuery';
import { rememberSearch } from './recentSearches';
import type { SearchDoc } from './searchTypes';
import { useAdminSearchIndex } from './useAdminSearchIndex';
import { useSearchEntities } from './useSearchEntities';
import { useTileTarget } from './useTileTarget';
import { withTileTarget } from './tileTarget';

/** Where "Show all matches in the list" goes for each group. */
const LIST_PATHS: Record<ListGroup, string> = {
    tenants: routePathNames.tenants,
    agencies: routePathNames.agency,
    accounts: routePathNames.users,
};

/**
 * The list "Show all matches in the list" opens. Konten has three tabs (Berater, Beratungsstellen-Admins,
 * Träger-Admins) and the plain users path shows the Berater tab, so accounts go to the tab of their
 * hits: the first tab in that order that has one. `docs` are the entity hits for the typed query.
 */
export const listPathFor = (group: ListGroup, docs: SearchDoc[]): string =>
    (group === 'accounts' && docs.find((doc) => doc.kind === 'account' && doc.listPath)?.listPath) || LIST_PATHS[group];

interface AdminSearchContextValue {
    isOpen: boolean;
    /** False outside a provider (or while disabled): callers fall back to their own search. */
    available: boolean;
    /** `trigger` is the button that was pressed: the view grows out of it and shrinks back into it. */
    open: (trigger?: Element | null) => void;
    close: () => void;
}

const noop = () => undefined;
const AdminSearchContext = createContext<AdminSearchContextValue>({
    isOpen: false,
    available: false,
    open: noop,
    close: noop,
});

/** `open()` shows the search view; a no-op outside the provider so buttons can render in isolation. */
export const useAdminSearch = () => useContext(AdminSearchContext);

/**
 * Ctrl/Cmd+K, the shortcut people know from other tools. A key that something else already handled
 * does not count: the open view closes itself on it, and without this check the same key event
 * would bubble up to the window and open the view again (at once when motion is reduced).
 */
export const isSearchShortcut = (
    event: Pick<KeyboardEvent, 'metaKey' | 'ctrlKey' | 'altKey' | 'defaultPrevented'> & { key?: string },
): boolean =>
    // `key` is missing on the keydown Chrome fires when a browser autofill entry is picked.
    event.key?.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey) && !event.altKey && !event.defaultPrevented;

const isTypingTarget = (target: EventTarget | null): boolean =>
    target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

/** "/" opens the search too (GitHub, Slack), as long as the person is not typing somewhere. */
export const isSlashShortcut = (
    event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'target' | 'defaultPrevented'>,
): boolean =>
    event.key === '/' &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.defaultPrevented &&
    !isTypingTarget(event.target);

export interface SearchOrigin {
    x: number;
    y: number;
}

const centreOf = (element: Element | null | undefined): SearchOrigin | undefined => {
    const rect = element?.getBoundingClientRect();

    return rect && rect.width > 0 ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined;
};

/** The pressed button, else any visible search button (keyboard shortcut), else the top middle. */
export const resolveOrigin = (trigger?: Element | null): SearchOrigin =>
    centreOf(trigger) ??
    centreOf(document.querySelector('[data-admin-search-button], [data-admin-mobile-nav-search]')) ?? {
        x: window.innerWidth / 2,
        y: 40,
    };

interface DialogProps {
    navItems: AdminSidebarNavItem[];
    account?: AdminSidebarNavItem;
    tree: Record<string, AdminNavSubsection[]>;
    origin: SearchOrigin;
    onClose: () => void;
    onClosing: () => void;
}

const AdminSearchDialog = ({ navItems, account, tree, origin, onClose, onClosing }: DialogProps) => {
    const navigate = useNavigate();
    const index = useAdminSearchIndex({ navItems, account, tree });
    const [query, setQuery] = useState('');
    const { docs, isFetching, hasError, forQuery } = useSearchEntities(query);

    const onOpen = useCallback(
        (doc: SearchDoc, typed: string) => {
            rememberSearch(typed);
            // The view closes itself (shrinking back into the button) right after this.
            navigate(withTileTarget(doc.to, doc.tileKey));
        },
        [navigate],
    );
    const onOpenList = useCallback(
        (group: ListGroup, typed: string) => {
            rememberSearch(typed);
            // Rows of an older query must not pick the tab.
            const hits = forQuery === typed.trim() ? docs : [];
            navigate(listPathWithQuery(listPathFor(group, hits), typed));
        },
        [navigate, docs, forQuery],
    );

    return (
        <AdminSearchView
            index={index}
            entityDocs={docs}
            entityQuery={forQuery}
            loadingEntities={isFetching}
            entitiesFailed={hasError}
            onQueryChange={setQuery}
            onOpen={onOpen}
            onOpenList={onOpenList}
            onClose={onClose}
            onClosing={onClosing}
            origin={origin}
        />
    );
};

interface ProviderProps {
    navItems: AdminSidebarNavItem[];
    account?: AdminSidebarNavItem;
    tree: Record<string, AdminNavSubsection[]>;
    /** The restricted layout (2FA gate) has no navigation to search. */
    disabled?: boolean;
    children: ReactNode;
}

/**
 * Owns the open state of the admin search and its keyboard shortcuts (Ctrl/Cmd+K and /), renders the
 * view while it is open, and makes the page a result opened scroll to its tile. Mount once
 * inside the router, around the layout.
 */
export const AdminSearchProvider = ({ navItems, account, tree, disabled = false, children }: ProviderProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [origin, setOrigin] = useState<SearchOrigin>({ x: 0, y: 0 });
    // "Open" in the sense of the shortcuts: false as soon as the view starts to leave, so a Ctrl/Cmd+K
    // during its shrink animation opens a new search instead of being lost (Admin search on Statistics).
    const isOpenRef = useRef(false);
    // Every open gets its own view; a view still shrinking away is replaced, not reused.
    const [session, setSession] = useState(0);
    const sessionRef = useRef(0);
    const returnFocus = useRef<HTMLElement | null>(null);
    useTileTarget();

    const open = useCallback((trigger?: Element | null) => {
        if (isOpenRef.current) {
            return;
        }

        isOpenRef.current = true;
        const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const insideLeavingView = !!focused?.closest('[data-admin-search]');

        // Reopened while the last view was leaving: focus still sits in that view, so keep where the
        // person came from before it.
        if (!insideLeavingView || trigger instanceof HTMLElement) {
            returnFocus.current = trigger instanceof HTMLElement ? trigger : focused;
        }
        sessionRef.current += 1;
        setSession(sessionRef.current);
        setOrigin(resolveOrigin(trigger));
        setIsOpen(true);
    }, []);
    const closeSession = useCallback((closingSession: number) => {
        // A view replaced by a newer one must not close its successor.
        if (closingSession !== sessionRef.current) {
            return;
        }
        isOpenRef.current = false;
        setIsOpen(false);
        // Back to where the person was, once the dialog is gone.
        window.setTimeout(() => returnFocus.current?.focus?.(), 0);
    }, []);
    const close = useCallback(() => closeSession(sessionRef.current), [closeSession]);
    const onClosing = useCallback(() => {
        isOpenRef.current = false;
    }, []);
    const onDialogClose = useCallback(() => closeSession(session), [closeSession, session]);

    useEffect(() => {
        if (disabled) {
            return undefined;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (isSearchShortcut(event)) {
                // While the view is open it closes itself (animated), see its own key handler.
                event.preventDefault();
                open();
            } else if (!isOpenRef.current && isSlashShortcut(event)) {
                event.preventDefault();
                open();
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [disabled, open]);

    const value = useMemo(() => ({ isOpen, available: !disabled, open, close }), [isOpen, disabled, open, close]);

    return (
        <AdminSearchContext.Provider value={value}>
            {children}
            {isOpen && !disabled && (
                <AdminSearchDialog
                    key={session}
                    navItems={navItems}
                    account={account}
                    tree={tree}
                    origin={origin}
                    onClose={onDialogClose}
                    onClosing={onClosing}
                />
            )}
        </AdminSearchContext.Provider>
    );
};
