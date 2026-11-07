import {
    Fragment,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent,
    type ReactNode,
} from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { groupHits, prepareIndex, searchIndex, type HitGroup } from './searchEngine';
import {
    GROUP_OF_KIND,
    SEARCH_GROUPS,
    SEARCH_LEVELS,
    type SearchDoc,
    type SearchFilters,
    type SearchGroup,
    type SearchHit,
    type SearchLevel,
} from './searchTypes';
import { ResultIcon } from './searchIcons';
import { clearRecentSearches, forgetSearch, getRecentSearches } from './recentSearches';
import styles from './adminSearch.module.scss';

export interface AdminSearchViewProps {
    /** Destinations this admin may open (see `buildSearchIndex`). */
    index: SearchDoc[];
    /** Rows from the list endpoints for the current query (tenants, agencies, topics, accounts). */
    entityDocs?: SearchDoc[];
    /** An entity request is still running. */
    loadingEntities?: boolean;
    /** Called with every query change; the container debounces it into the list requests. */
    onQueryChange?: (query: string) => void;
    onOpen: (doc: SearchDoc, query: string) => void;
    onClose: () => void;
    initialQuery?: string;
    initialFilters?: SearchFilters;
    /** Controlled recent searches (stories); defaults to this browser's. */
    recent?: string[];
    /** `inline` renders in the flow instead of as an overlay (stories, screenshots). */
    variant?: 'overlay' | 'inline';
    /** Show the Esc hint and key legend (desktop keyboard users). */
    showKeyHints?: boolean;
    /**
     * Where the view grows out of and shrinks back into (viewport px, centre of the button that
     * opened it). The overlay is a circle reveal from this point, so it reads as a layer above the
     * page and not as a new page.
     */
    origin?: { x: number; y: number };
}

const groupOf = (doc: SearchDoc): SearchGroup => GROUP_OF_KIND[doc.kind];

/** Groups shown per query before "show more". */
const PER_GROUP = 4;

/** Keep in step with `$reveal-duration` in the stylesheet. */
const REVEAL_MS = 300;

/** Radius of the circle that covers the whole viewport when it grows out of `origin`. */
const coverRadius = (origin: { x: number; y: number }) =>
    Math.ceil(
        Math.hypot(Math.max(origin.x, window.innerWidth - origin.x), Math.max(origin.y, window.innerHeight - origin.y)),
    );

const renderTitle = (title: string, ranges: Array<[number, number]>): ReactNode => {
    if (!ranges.length) {
        return title;
    }

    const parts: ReactNode[] = [];
    let cursor = 0;

    ranges.forEach(([start, end], index) => {
        if (start > cursor) {
            parts.push(title.slice(cursor, start));
        }
        parts.push(
            <mark key={`${start}-${index}`} className={styles.mark}>
                {title.slice(start, end)}
            </mark>,
        );
        cursor = end;
    });
    parts.push(title.slice(cursor));

    return parts.map((part, index) => <Fragment key={index}>{part}</Fragment>);
};

/** One stop of the arrow keys: a hit, or the "Show n more" row that ends a long group. */
type NavRow = { kind: 'hit'; hit: SearchHit } | { kind: 'more'; group: SearchGroup; count: number };

const toggle = <T,>(list: T[] | undefined, value: T): T[] =>
    list?.includes(value) ? list.filter((item) => item !== value) : [...(list ?? []), value];

export const AdminSearchView = ({
    index,
    entityDocs = [],
    loadingEntities = false,
    onQueryChange,
    onOpen,
    onClose,
    initialQuery = '',
    initialFilters = {},
    recent: recentProp,
    variant = 'overlay',
    showKeyHints = true,
    origin,
}: AdminSearchViewProps) => {
    const { t } = useTranslation();
    const [query, setQuery] = useState(initialQuery);
    const [filters, setFilters] = useState<SearchFilters>(initialFilters);
    const [activeIndex, setActiveIndex] = useState(0);
    const [expanded, setExpanded] = useState<Set<SearchGroup>>(new Set());
    const [recentState, setRecentState] = useState<string[]>(() => getRecentSearches());
    const recent = recentProp ?? recentState;
    const [closing, setClosing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const closeTimer = useRef<number | undefined>(undefined);
    const animated = variant === 'overlay' && !!origin;
    const listId = useId();
    const trimmed = query.trim();

    const prepared = useMemo(() => prepareIndex([...index, ...entityDocs]), [index, entityDocs]);
    const entityIds = useMemo(() => new Set(entityDocs.map((doc) => doc.id)), [entityDocs]);
    // The server matched these by something the index does not hold (email, id): keep them, rank low.
    const withPassthrough = (found: SearchHit[], active: SearchFilters): SearchHit[] => {
        const foundIds = new Set(found.map((hit) => hit.doc.id));
        const extra: SearchHit[] = entityDocs
            .filter((doc) => !foundIds.has(doc.id))
            .filter((doc) => !active.kinds?.length || active.kinds.some((group) => groupOf(doc) === group))
            .filter((doc) => !active.levels?.length || (doc.level && active.levels.includes(doc.level)))
            .map((doc) => ({ doc, score: 20, matchedField: 'title' as const, titleRanges: [] }));

        return [...found, ...extra];
    };

    // Level counts and group chips are computed without the chip they belong to, so a chip never
    // shows "0" just because it is the one switched on.
    const baseHits = useMemo(
        () =>
            trimmed
                ? withPassthrough(searchIndex(prepared, trimmed, { levels: filters.levels }), {
                      levels: filters.levels,
                  })
                : [],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [prepared, trimmed, filters.levels, entityDocs],
    );

    const hits = useMemo(
        () => (trimmed ? withPassthrough(searchIndex(prepared, trimmed, filters), filters) : []),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [prepared, trimmed, filters, entityDocs],
    );

    const groups: HitGroup[] = useMemo(() => groupHits(hits, 1000), [hits]);
    const visibleGroups = useMemo(
        () =>
            groups.map((group) => {
                const open = expanded.has(group.group);

                return {
                    ...group,
                    shown: open ? group.hits : group.hits.slice(0, PER_GROUP),
                    more: open ? 0 : Math.max(0, group.hits.length - PER_GROUP),
                };
            }),
        [groups, expanded],
    );
    const flat = useMemo(() => visibleGroups.flatMap((group) => group.shown), [visibleGroups]);
    // What the arrow keys walk through: the hits, and at the end of a long group its "Show n more"
    // row, which is an option too (a listbox may only own options and groups of options).
    const rows = useMemo<NavRow[]>(
        () =>
            visibleGroups.flatMap((group) => [
                ...group.shown.map((hit): NavRow => ({ kind: 'hit', hit })),
                ...(group.more > 0 ? [{ kind: 'more' as const, group: group.group, count: group.more }] : []),
            ]),
        [visibleGroups],
    );
    const countsByGroup = useMemo(() => {
        const counts = new Map<SearchGroup, number>();

        baseHits.forEach((hit) => counts.set(groupOf(hit.doc), (counts.get(groupOf(hit.doc)) ?? 0) + 1));

        return counts;
    }, [baseHits]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);
    useEffect(() => {
        setActiveIndex(0);
    }, [trimmed, filters]);
    useEffect(() => {
        onQueryChange?.(trimmed);
    }, [trimmed, onQueryChange]);
    useEffect(() => {
        panelRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView?.({ block: 'nearest' });
    }, [activeIndex, rows]);

    useEffect(() => () => window.clearTimeout(closeTimer.current), []);

    /** Shrinks back into the opening button, then reports `onClose` (at once without motion). */
    const requestClose = () => {
        if (closing) {
            return;
        }
        if (!animated || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            onClose();
            return;
        }

        setClosing(true);
        // Safety net: `animationend` does not fire when the tab is hidden.
        closeTimer.current = window.setTimeout(onClose, REVEAL_MS + 120);
    };

    const open = (hit: SearchHit) => {
        // The page behind changes while the layer shrinks away.
        onOpen(hit.doc, trimmed);
        requestClose();
    };

    /** A hit opens; the "Show n more" row opens the rest of its group (the cursor stays in place). */
    const showAll = (group: SearchGroup) => setExpanded((current) => new Set(current).add(group));
    /** The buttons of the empty state disappear when they are used; focus goes back to the field, not to the page. */
    const refocusField = () => inputRef.current?.focus();
    const applyQuery = (value: string) => {
        setQuery(value);
        refocusField();
    };
    const activate = (row: NavRow) => (row.kind === 'hit' ? open(row.hit) : showAll(row.group));

    const onKeyDown = (event: KeyboardEvent) => {
        // The cursor through the results belongs to the combobox (aria-activedescendant). On a chip,
        // the clear or back button, or the scrolling results region, Enter and the arrows keep their
        // own meaning: activate the control, scroll.
        const fromField = event.target === inputRef.current;

        if (event.key === 'Escape' || (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey))) {
            // Esc, and the shortcut that opened it, close it again (from anywhere in the dialog).
            event.preventDefault();
            requestClose();
        } else if (fromField && event.key === 'ArrowDown' && rows.length) {
            event.preventDefault();
            setActiveIndex((current) => (current + 1) % rows.length);
        } else if (fromField && event.key === 'ArrowUp' && rows.length) {
            event.preventDefault();
            setActiveIndex((current) => (current - 1 + rows.length) % rows.length);
        } else if (fromField && event.key === 'Enter' && rows[activeIndex]) {
            event.preventDefault();
            activate(rows[activeIndex]);
        } else if (event.key === 'Tab') {
            // The dialog is modal: Tab cycles inside it.
            const focusable = Array.from(
                panelRef.current?.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), input:not([disabled]), [tabindex="0"]',
                ) ?? [],
            );
            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (first && last && event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (first && last && !event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    };

    const typeChips = SEARCH_GROUPS.filter(
        (group) => !trimmed || countsByGroup.has(group) || filters.kinds?.includes(group),
    );
    const levelLabel = (level: SearchLevel) => t(`adminSearch.level.${level}`);
    const groupLabel = (group: SearchGroup) => t(`adminSearch.group.${group}`);
    const filtersActive = !!(filters.kinds?.length || filters.levels?.length);
    const activeId = rows[activeIndex] ? `${listId}-option-${activeIndex}` : undefined;

    const chip = (label: string, on: boolean, onClick: () => void, count?: number, key?: string) => (
        <button
            key={key ?? label}
            type="button"
            className={classNames(styles.chip, { [styles.chipOn]: on })}
            aria-pressed={on}
            onClick={onClick}
        >
            {label}
            {count !== undefined && <span className={styles.chipCount}>{count}</span>}
        </button>
    );

    const suggestions = [1, 2, 3, 4].map((n) => t(`adminSearch.suggestion.${n}`));
    let optionNumber = -1;

    return (
        <div
            className={classNames(styles.root, {
                [styles.inline]: variant === 'inline',
                [styles.reveal]: animated,
                [styles.closing]: closing,
            })}
            style={
                animated && origin
                    ? ({
                          '--search-origin-x': `${origin.x}px`,
                          '--search-origin-y': `${origin.y}px`,
                          '--search-radius': `${coverRadius(origin)}px`,
                      } as CSSProperties)
                    : undefined
            }
            onAnimationEnd={(event) => {
                if (closing && event.target === event.currentTarget) {
                    window.clearTimeout(closeTimer.current);
                    onClose();
                }
            }}
            data-admin-search
        >
            {variant === 'overlay' && (
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- decorative scrim; Esc and the back button close it for keyboard users
                <div className={styles.scrim} onClick={requestClose} aria-hidden data-admin-search-scrim />
            )}
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- dialog keys (Esc, Tab trap) are handled on the dialog, as in the APG dialog pattern */}
            <div
                ref={panelRef}
                className={styles.panel}
                role="dialog"
                aria-modal="true"
                aria-label={t('adminSearch.title')}
                onKeyDown={onKeyDown}
            >
                <div className={styles.bar}>
                    <button
                        type="button"
                        className={classNames(styles.iconButton, styles.leading)}
                        onClick={requestClose}
                        aria-label={t('adminSearch.close')}
                    >
                        <ArrowBackIcon />
                    </button>
                    <input
                        ref={inputRef}
                        className={styles.input}
                        type="text"
                        role="combobox"
                        aria-expanded={flat.length > 0}
                        aria-controls={listId}
                        aria-activedescendant={activeId}
                        aria-autocomplete="list"
                        aria-label={t('adminSearch.title')}
                        placeholder={t('adminSearch.placeholder')}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        enterKeyHint="go"
                        inputMode="search"
                    />
                    {query ? (
                        <button
                            type="button"
                            className={styles.iconButton}
                            aria-label={t('adminSearch.clear')}
                            onClick={() => {
                                setQuery('');
                                inputRef.current?.focus();
                            }}
                        >
                            <CloseIcon />
                        </button>
                    ) : (
                        showKeyHints && <kbd className={styles.escHint}>Esc</kbd>
                    )}
                </div>
                {loadingEntities ? (
                    <div className={styles.progress} role="progressbar" aria-label={t('adminSearch.loading')} />
                ) : (
                    <div className={styles.progressIdle} />
                )}

                <div className={styles.chips} role="group" aria-label={t('adminSearch.filter.label')}>
                    {typeChips.length > 0 && (
                        <>
                            <span className={styles.chipLabel}>{t('adminSearch.filter.type')}</span>
                            {typeChips.map((group) =>
                                chip(
                                    groupLabel(group),
                                    !!filters.kinds?.includes(group),
                                    () =>
                                        setFilters((current) => ({ ...current, kinds: toggle(current.kinds, group) })),
                                    trimmed ? countsByGroup.get(group) ?? 0 : undefined,
                                    `type-${group}`,
                                ),
                            )}
                            <span className={styles.chipDivider} aria-hidden />
                        </>
                    )}
                    <span className={styles.chipLabel}>{t('adminSearch.filter.level')}</span>
                    {SEARCH_LEVELS.map((level) =>
                        chip(
                            levelLabel(level),
                            !!filters.levels?.includes(level),
                            () => setFilters((current) => ({ ...current, levels: toggle(current.levels, level) })),
                            undefined,
                            `level-${level}`,
                        ),
                    )}
                </div>

                {/* The results scroll inside the panel; axe (scrollable-region-focusable) wants such a region reachable by keyboard. */}
                {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
                <div className={styles.body} role="region" aria-label={t('adminSearch.results')} tabIndex={0}>
                    <p className={styles.srOnly} role="status" aria-live="polite">
                        {trimmed ? t('adminSearch.count', { count: flat.length }) : ''}
                    </p>

                    {!trimmed && (
                        <>
                            {recent.length > 0 && (
                                <div className={styles.section}>
                                    <div className={styles.sectionHead}>
                                        <span>{t('adminSearch.recent')}</span>
                                        <button
                                            type="button"
                                            className={styles.textButton}
                                            onClick={() => {
                                                clearRecentSearches();
                                                setRecentState([]);
                                                refocusField();
                                            }}
                                        >
                                            {t('adminSearch.recent.clear')}
                                        </button>
                                    </div>
                                    {recent.map((item) => (
                                        <div key={item} className={styles.recentRow}>
                                            <HistoryIcon className={styles.rowIcon} />
                                            <button
                                                type="button"
                                                className={classNames(styles.recentLabel, styles.textButton)}
                                                style={{ color: 'inherit', textAlign: 'left', padding: 0 }}
                                                onClick={() => applyQuery(item)}
                                            >
                                                {item}
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.iconButton}
                                                aria-label={t('adminSearch.recent.remove', { query: item })}
                                                onClick={() => {
                                                    setRecentState(forgetSearch(item));
                                                    refocusField();
                                                }}
                                            >
                                                <CloseIcon fontSize="small" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p className={styles.hint}>{t('adminSearch.hint')}</p>
                            <div className={styles.suggestions}>
                                <span className={styles.chipLabel}>{t('adminSearch.suggestions')}</span>
                                {suggestions.map((suggestion) => chip(suggestion, false, () => applyQuery(suggestion)))}
                            </div>
                        </>
                    )}

                    {trimmed && flat.length === 0 && (
                        <div className={styles.empty}>
                            <p className={styles.emptyTitle}>{t('adminSearch.empty.title', { query: trimmed })}</p>
                            <p className={styles.emptyText}>
                                {filtersActive ? t('adminSearch.empty.filtered') : t('adminSearch.empty.text')}
                            </p>
                            {filtersActive && (
                                <button type="button" className={styles.textButton} onClick={() => setFilters({})}>
                                    {t('adminSearch.filter.reset')}
                                </button>
                            )}
                        </div>
                    )}

                    {trimmed && flat.length > 0 && (
                        <div id={listId} role="listbox" aria-label={t('adminSearch.title')}>
                            {visibleGroups.map((group) => (
                                <div key={group.group} role="group" aria-labelledby={`${listId}-group-${group.group}`}>
                                    {/* The group's name, not a heading: a listbox may only own options and groups of options. */}
                                    <div
                                        id={`${listId}-group-${group.group}`}
                                        className={styles.groupTitle}
                                        role="presentation"
                                    >
                                        {groupLabel(group.group)}
                                    </div>
                                    <ul className={styles.list} role="presentation">
                                        {group.shown.map((hit) => {
                                            optionNumber += 1;
                                            const number = optionNumber;
                                            const active = number === activeIndex;
                                            // Say why a hit is here when the title alone would puzzle ("Impressum" → "Legal notice").
                                            const showMatch =
                                                hit.matchedText &&
                                                !hit.titleRanges.length &&
                                                hit.matchedText !== hit.doc.title &&
                                                hit.matchedField !== 'description';

                                            // Where it lives ("Settings › Legal"), else what it is; "Matches …" follows after a dot.
                                            const secondary =
                                                hit.doc.breadcrumb.slice(0, -1).join(' › ') || hit.doc.description;

                                            return (
                                                // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- APG combobox/listbox: the options are driven by keys on the input (arrows, Enter), the click is the pointer path
                                                <li
                                                    key={hit.doc.id}
                                                    id={`${listId}-option-${number}`}
                                                    role="option"
                                                    aria-selected={active}
                                                    data-active={active}
                                                    className={classNames(styles.row, { [styles.rowActive]: active })}
                                                    onMouseMove={() => active || setActiveIndex(number)}
                                                    onClick={() => open(hit)}
                                                >
                                                    <ResultIcon doc={hit.doc} className={styles.rowIcon} />
                                                    <div className={styles.rowText}>
                                                        <div className={styles.title}>
                                                            {renderTitle(hit.doc.title, hit.titleRanges)}
                                                        </div>
                                                        <div className={styles.secondary}>
                                                            {secondary}
                                                            {showMatch && (
                                                                <span className={styles.matches}>
                                                                    {secondary ? ' · ' : ''}
                                                                    {t('adminSearch.matches', {
                                                                        text: hit.matchedText,
                                                                    })}
                                                                </span>
                                                            )}
                                                            {entityIds.has(hit.doc.id) &&
                                                                hit.doc.description &&
                                                                hit.doc.breadcrumb.length > 1 &&
                                                                ` · ${hit.doc.description}`}
                                                        </div>
                                                    </div>
                                                    <div className={styles.badges}>
                                                        {hit.doc.readOnly && (
                                                            <span className={styles.badge}>
                                                                {t('adminSearch.readOnly')}
                                                            </span>
                                                        )}
                                                        {hit.doc.level && hit.doc.kind === 'setting' && (
                                                            <span className={styles.badge}>
                                                                {levelLabel(hit.doc.level)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {active && showKeyHints && (
                                                        <KeyboardReturnIcon
                                                            className={styles.enter}
                                                            fontSize="small"
                                                            aria-hidden
                                                        />
                                                    )}
                                                </li>
                                            );
                                        })}
                                        {group.more > 0 &&
                                            (() => {
                                                optionNumber += 1;
                                                const number = optionNumber;
                                                const active = number === activeIndex;

                                                return (
                                                    // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- same as the hits: keys go through the input
                                                    <li
                                                        id={`${listId}-option-${number}`}
                                                        role="option"
                                                        aria-selected={active}
                                                        data-active={active}
                                                        className={classNames(styles.more, {
                                                            [styles.rowActive]: active,
                                                        })}
                                                        onMouseMove={() => active || setActiveIndex(number)}
                                                        onClick={() => showAll(group.group)}
                                                    >
                                                        {t('adminSearch.group.more', { count: group.more })}
                                                    </li>
                                                );
                                            })()}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {showKeyHints && (
                    <div className={styles.footer} aria-hidden>
                        <span>
                            <span className={styles.key}>↑↓</span>
                            {t('adminSearch.keys.navigate')}
                        </span>
                        <span>
                            <span className={styles.key}>↵</span>
                            {t('adminSearch.keys.open')}
                        </span>
                        <span>
                            <span className={styles.key}>Esc</span>
                            {t('adminSearch.keys.close')}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminSearchView;
