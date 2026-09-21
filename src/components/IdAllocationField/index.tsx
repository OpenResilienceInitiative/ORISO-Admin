import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type Ref } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { M3NumberField } from '../M3NumberField';
import type { IdUnitOption, IdValidationState, UseIdAllocationResult } from './useIdAllocation';
import styles from './styles.module.scss';

export { useIdAllocation } from './useIdAllocation';
export type { IdFieldMode, IdUnitOption, IdValidationState, UseIdAllocationResult } from './useIdAllocation';

/** Type-ahead data source (#1026). Wired to the real Träger/agency search later; stories inject fixtures. */
export type IdUnitSearch = (query: string) => Promise<IdUnitOption[]> | IdUnitOption[];

export interface IdAllocationFieldProps {
    /** Visible field label, e.g. "Träger" / "Beratungsstelle". */
    label: string;
    /** State machine from {@link useIdAllocation} — owned by the parent so it can gate submits. */
    allocation: UseIdAllocationResult;
    disabled?: boolean;
    /**
     * Viewer scope lock (#1026): the value stays visible but cannot change —
     * a tenant admin's own Träger, an agency admin's own Beratungsstelle.
     */
    locked?: boolean;
    /** Searches existing units by name (and topic, for agencies). Omit and the menu offers only "Neu" + typed numbers. */
    searchUnits?: IdUnitSearch;
    /**
     * `false` = this field can only point at an EXISTING unit (no "Neu anlegen";
     * a typed number means "the unit with that number").
     */
    allowCreate?: boolean;
    /**
     * `false` = only units the search returned can be picked; a typed number is
     * a search query, never taken over as a unit (#1026: an agency admin may only
     * invite into their OWN agencies, which is exactly what the scoped search
     * returns). Default `true`.
     */
    acceptTypedIds?: boolean;
    /**
     * #1026 slice 5: a number reserved by an open ADMIN invite is not a
     * collision for this invite — it joins that unit (a counsellor waits for
     * it, a second admin shares the reservation). The field then explains
     * instead of showing an error. Default `false` (reserved = taken).
     */
    reservedJoinsPendingUnit?: boolean;
    /** Called when focus leaves the field (the invite bar collapses a valid field then). */
    onBlur?: () => void;
    inputRef?: Ref<HTMLInputElement>;
    className?: string;
}

const BLOCKING_STATES: IdValidationState[] = ['reserved', 'assigned', 'error'];
const DIGITS = /^\d+$/;
const SEARCH_DEBOUNCE_MS = 150;

type MenuEntry =
    | { key: string; kind: 'create'; label: string }
    | { key: string; kind: 'typed'; id: number; label: string }
    | { key: string; kind: 'unit'; unit: IdUnitOption; label: string; secondary: string };

const CheckMark = () => (
    <svg className={styles.optionCheck} width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M7.1 12.3 3.6 8.8l1-1 2.5 2.5 5.3-5.3 1 1z" fill="currentColor" />
    </svg>
);

/**
 * Invite-bar ID field (ORISO-Admin#570, reworked for #1026): one control for
 * "invite into an EXISTING unit" and "create a NEW one".
 *
 * - Focus opens a type-ahead: existing units by name or topic, "＋ Neu anlegen
 *   (nächste freie Nummer)" (the former Auto toggle), and a typed number.
 * - The ⌄/^ split steps through FREE numbers only and hard-overwrites the value.
 * - The field is only as wide as what it shows.
 * The data layer stays behind {@link useIdAllocation} and `searchUnits`.
 */
export const IdAllocationField = ({
    label,
    allocation,
    disabled = false,
    locked = false,
    searchUnits,
    allowCreate = true,
    acceptTypedIds = true,
    reservedJoinsPendingUnit = false,
    onBlur,
    inputRef,
    className,
}: IdAllocationFieldProps) => {
    const { t } = useTranslation();
    const listId = useId();
    const anchorRef = useRef<HTMLDivElement>(null);
    const { mode, value, unit, validation, stepUpDisabled, stepDownDisabled, step } = allocation;

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<IdUnitOption[]>([]);
    const [nextFree, setNextFree] = useState<number | null | undefined>();
    const [activeIndex, setActiveIndex] = useState(0);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; minWidth: number }>();

    const inactive = disabled || locked;
    const isError = BLOCKING_STATES.includes(validation) && !(reservedJoinsPendingUnit && validation === 'reserved');

    const newLabel = t('idAllocationField.new', 'Neu');
    const unitText = (option: IdUnitOption) =>
        option.name
            ? `${option.name} · ${option.id}`
            : t('idAllocationField.unitNumber', 'Nr. {{id}}', { id: option.id });
    // What the field shows while it is not being typed into.
    const restingText = (() => {
        if (mode === 'existing' && unit) return unitText(unit);
        if (mode === 'auto') return allowCreate ? newLabel : '';
        return value === undefined ? '' : String(value);
    })();

    // --- search -----------------------------------------------------------
    useEffect(() => {
        if (!open || !searchUnits) return undefined;
        let cancelled = false;
        const timer = window.setTimeout(() => {
            Promise.resolve(searchUnits(query.trim()))
                .then((found) => {
                    if (!cancelled) setResults(found);
                })
                .catch(() => {
                    if (!cancelled) setResults([]);
                });
        }, SEARCH_DEBOUNCE_MS);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [open, query, searchUnits]);

    useEffect(() => {
        if (!open || !allowCreate) return undefined;
        let cancelled = false;
        allocation.peekNextFree().then((id) => {
            if (!cancelled) setNextFree(id);
        });
        return () => {
            cancelled = true;
        };
        // Refresh the preview each time the menu opens, not on every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, allowCreate]);

    // --- menu entries -------------------------------------------------------
    const trimmed = query.trim();
    const entries: MenuEntry[] = [];
    if (allowCreate) {
        entries.push({
            key: 'create',
            kind: 'create',
            label:
                nextFree != null
                    ? t('idAllocationField.createNextFree', '＋ Neu anlegen (nächste freie Nummer: {{id}})', {
                          id: nextFree,
                      })
                    : t('idAllocationField.createNew', '＋ Neu anlegen (nächste freie Nummer)'),
        });
    }
    if (acceptTypedIds && DIGITS.test(trimmed)) {
        const id = Number(trimmed);
        entries.push({
            key: `typed-${id}`,
            kind: 'typed',
            id,
            label: allowCreate
                ? t('idAllocationField.useTypedNew', 'Nummer {{id}} verwenden', { id })
                : t('idAllocationField.useTypedExisting', 'Nr. {{id}} übernehmen', { id }),
        });
    }
    results.forEach((option) =>
        entries.push({
            key: `unit-${option.id}`,
            kind: 'unit',
            unit: option,
            label: option.name ?? t('idAllocationField.unitNumber', 'Nr. {{id}}', { id: option.id }),
            secondary: [
                t('idAllocationField.unitNumber', 'Nr. {{id}}', { id: option.id }),
                ...(option.topics ?? []),
            ].join(' · '),
        }),
    );
    const noMatches =
        searchUnits != null && trimmed !== '' && !(acceptTypedIds && DIGITS.test(trimmed)) && results.length === 0;

    const isSelected = (entry: MenuEntry) => {
        if (entry.kind === 'create') return mode === 'auto';
        if (entry.kind === 'unit') return mode === 'existing' && unit?.id === entry.unit.id;
        return mode !== 'auto' && value === entry.id;
    };

    // --- positioning (portal: the invite row scrolls and would clip a menu) --
    const place = useCallback(() => {
        const rect = anchorRef.current?.getBoundingClientRect();
        if (!rect) return;
        // Keep the sheet on screen on a 320px phone: never wider than the viewport, never past its right edge.
        const minWidth = Math.min(Math.max(rect.width, 280), window.innerWidth - 16);
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - minWidth - 8));
        setMenuPosition({ top: rect.bottom + 4, left, minWidth });
    }, []);

    useLayoutEffect(() => {
        if (!open) return undefined;
        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [open, place]);

    // --- interaction ----------------------------------------------------------
    const openMenu = () => {
        if (inactive || open) return;
        setQuery(mode === 'manual' && value !== undefined ? String(value) : '');
        setActiveIndex(0);
        setOpen(true);
    };

    const closeMenu = () => {
        setOpen(false);
        setQuery('');
    };

    const choose = (entry: MenuEntry) => {
        if (entry.kind === 'create') allocation.resetToAuto();
        else if (entry.kind === 'unit') allocation.selectExisting(entry.unit);
        else if (allowCreate) allocation.setManualValue(entry.id);
        else allocation.selectExisting({ id: entry.id });
        closeMenu();
    };

    const handleTextChange = (raw: string) => {
        setQuery(raw);
        setActiveIndex(0);
        if (!open) setOpen(true);
        const typed = raw.trim();
        // A typed number applies immediately — the availability check (new) or
        // the unit pick (existing-only) runs while the admin keeps typing.
        if (acceptTypedIds && DIGITS.test(typed)) {
            if (allowCreate) allocation.setManualValue(Number(typed));
            else allocation.selectExisting({ id: Number(typed) });
        }
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (!open) {
            if (event.key === 'Enter') {
                event.preventDefault();
                openMenu();
            }
            return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            // While the menu is open the arrows move through it; the ⌄/^ buttons still step.
            event.preventDefault();
            if (entries.length === 0) return;
            const delta = event.key === 'ArrowDown' ? 1 : -1;
            setActiveIndex((index) => (index + delta + entries.length) % entries.length);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const entry = entries[activeIndex];
            if (entry) choose(entry);
            else closeMenu();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            closeMenu();
        }
    };

    /*
     * Owner rule: the supporting line is for a PROBLEM or a pending action, never
     * for a confirmation. `auto`, `available` and `existing` therefore map to
     * `undefined`, which makes M3NumberField skip the element entirely.
     */
    const supportingText: Record<IdValidationState, string | undefined> = {
        auto: undefined,
        empty: allowCreate
            ? t('idAllocationField.emptyHint', 'Suchen, Nummer eingeben oder „Neu anlegen“ wählen.')
            : t('idAllocationField.emptyHintExisting', 'Suchen oder Nummer eingeben.'),
        checking: t('idAllocationField.checking', 'Verfügbarkeit wird geprüft …'),
        available: undefined,
        reserved: reservedJoinsPendingUnit
            ? t(
                  'idAllocationField.reservedJoinsPending',
                  'Nr. {{id}} wird mit einer offenen Admin-Einladung angelegt — diese Einladung schließt sich an.',
                  { id: value },
              )
            : t('idAllocationField.reserved', 'Diese ID ist durch eine offene Einladung reserviert.'),
        assigned: t('idAllocationField.assigned', 'Diese ID ist bereits vergeben.'),
        error: t('idAllocationField.serviceError', 'Verfügbarkeit konnte nicht geprüft werden.'),
        existing: undefined,
    };

    const activeEntry = open ? entries[activeIndex] : undefined;

    return (
        <div
            ref={anchorRef}
            className={classNames(styles.anchor, className)}
            // Focus moving between the input and the ⌄/^ split stays "inside"
            // the field; only leaving it altogether counts as a blur.
            onBlur={(event) => {
                if (!anchorRef.current?.contains(event.relatedTarget as Node | null)) onBlur?.();
            }}
            // A pointer press on ⌄/^ must not steal focus from the input (the bar
            // would treat that as leaving the field) — the click still steps.
            onMouseDownCapture={(event) => {
                if ((event.target as HTMLElement).closest('button')) {
                    event.preventDefault();
                    closeMenu();
                }
            }}
        >
            <M3NumberField
                disabled={inactive}
                displayText={open ? query : restingText}
                error={isError}
                fitContent
                inputProps={{
                    role: 'combobox',
                    'aria-autocomplete': 'list',
                    'aria-expanded': open,
                    'aria-controls': open ? listId : undefined,
                    'aria-activedescendant': activeEntry ? `${listId}-${activeEntry.key}` : undefined,
                    autoComplete: 'off',
                    placeholder: allowCreate
                        ? t('idAllocationField.searchPlaceholder', 'Name, Thema oder Nr.')
                        : t('idAllocationField.searchPlaceholderExisting', 'Name oder Nr.'),
                    title: locked ? t('idAllocationField.locked', 'Auf Ihre Einheit festgelegt') : undefined,
                    onClick: openMenu,
                    onFocus: openMenu,
                    onBlur: closeMenu,
                    onKeyDown: handleKeyDown,
                }}
                inputRef={inputRef}
                label={label}
                min={1}
                stepDownDisabled={stepDownDisabled || locked || !allowCreate}
                stepUpDisabled={stepUpDisabled || locked || !allowCreate}
                supportingText={supportingText[validation]}
                value={value}
                // A confirmed value — a free number or an existing unit — reads filled.
                variant={validation === 'available' || validation === 'existing' ? 'filled' : 'outlined'}
                onStep={allowCreate ? step : undefined}
                onTextChange={handleTextChange}
            />
            {open &&
                menuPosition &&
                createPortal(
                    <ul
                        aria-label={label}
                        className={styles.menu}
                        id={listId}
                        role="listbox"
                        style={{ top: menuPosition.top, left: menuPosition.left, minWidth: menuPosition.minWidth }}
                        // Keep focus in the input: a click on an option must not blur (and close) first.
                        onMouseDown={(event) => event.preventDefault()}
                    >
                        {entries.map((entry, index) => {
                            const selected = isSelected(entry);
                            return (
                                // Combobox pattern: the keyboard stays in the input (arrows + Enter
                                // above); options are pointer targets announced via activedescendant.
                                // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                                <li
                                    aria-selected={selected}
                                    className={classNames(styles.option, {
                                        [styles.optionSelected]: selected,
                                        [styles.optionActive]: index === activeIndex,
                                        [styles.optionCreate]: entry.kind === 'create',
                                    })}
                                    id={`${listId}-${entry.key}`}
                                    key={entry.key}
                                    role="option"
                                    onClick={() => choose(entry)}
                                    onMouseEnter={() => setActiveIndex(index)}
                                >
                                    {selected && <CheckMark />}
                                    <span className={styles.optionText}>
                                        <span className={styles.optionLabel}>{entry.label}</span>
                                        {entry.kind === 'unit' && (
                                            <span className={styles.optionSecondary}>{entry.secondary}</span>
                                        )}
                                    </span>
                                </li>
                            );
                        })}
                        {noMatches && (
                            <li aria-disabled className={styles.empty} role="option" aria-selected={false}>
                                {t('idAllocationField.noMatches', 'Keine Treffer')}
                            </li>
                        )}
                    </ul>,
                    document.body,
                )}
        </div>
    );
};

export default IdAllocationField;
