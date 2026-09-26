import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type Ref } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { M3NumberField } from '../M3NumberField';
import type { IdUnitOption, IdValidationState, UseIdAllocationResult } from './useIdAllocation';
import styles from './styles.module.scss';

export { useIdAllocation } from './useIdAllocation';
export type { IdFieldMode, IdUnitOption, IdValidationState, UseIdAllocationResult } from './useIdAllocation';

export type IdUnitSearch = (query: string) => Promise<IdUnitOption[]> | IdUnitOption[];

export interface IdAllocationFieldProps {
    /** Visible field label, e.g. "Träger" / "Beratungsstelle". */
    label: string;
    /** State machine from {@link useIdAllocation} — owned by the parent so it can gate submits. */
    allocation: UseIdAllocationResult;
    disabled?: boolean;
    /** Viewer scope lock: the admin's own Träger or Beratungsstelle stays visible but fixed. */
    locked?: boolean;
    /** Searches existing units by name (and topic, for agencies). Omit and the menu offers only "Neu" + typed numbers. */
    searchUnits?: IdUnitSearch;
    /** `false`: existing units only, so a typed number means the unit with that number. */
    allowCreate?: boolean;
    /** `false`: a typed number is only a search query, so an agency admin picks among their own agencies. */
    acceptTypedIds?: boolean;
    /** A number reserved by an open admin invite is joined, not a collision (the invite waits for that unit). */
    reservedJoinsPendingUnit?: boolean;
    /** Looks a number up; `null` = no such unit. Without it, typed numbers are never taken as existing. */
    resolveUnit?: (id: number) => Promise<IdUnitOption | null>;
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

/** One control for inviting into an EXISTING unit or creating a NEW one. */
export const IdAllocationField = ({
    label,
    allocation,
    disabled = false,
    locked = false,
    searchUnits,
    allowCreate = true,
    acceptTypedIds = true,
    reservedJoinsPendingUnit = false,
    resolveUnit,
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
    // The last number looked up via `resolveUnit`; `unit: null` = no such unit.
    const [resolved, setResolved] = useState<{ id: number; unit: IdUnitOption | null } | undefined>();
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

    // Existing-only field: a typed number counts only once it resolves to a real unit.
    const typedId = acceptTypedIds && DIGITS.test(query.trim()) ? Number(query.trim()) : undefined;
    const lookupToken = useRef(0);
    const lookUpTyped = (id: number) => {
        if (!resolveUnit) return;
        lookupToken.current += 1;
        const token = lookupToken.current;
        resolveUnit(id)
            .catch(() => null)
            .then((found) => {
                if (token !== lookupToken.current) return;
                setResolved({ id, unit: found });
                // A miss must not leave an earlier pick (9 before 90) selected and submittable.
                if (found) allocation.selectExisting(found);
                else allocation.resetToAuto();
            });
    };
    useEffect(() => {
        if (!open || allowCreate || typedId === undefined || !resolveUnit) return undefined;
        const timer = window.setTimeout(() => lookUpTyped(typedId), SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, allowCreate, typedId, resolveUnit]);

    // A taken number usually is an existing unit: look it up so the menu can offer it.
    const assignedId = mode === 'manual' && validation === 'assigned' ? value : undefined;
    useEffect(() => {
        if (!allowCreate || assignedId === undefined || !resolveUnit) return undefined;
        let cancelled = false;
        resolveUnit(assignedId)
            .catch(() => null)
            .then((found) => {
                if (!cancelled) setResolved({ id: assignedId, unit: found });
            });
        return () => {
            cancelled = true;
        };
    }, [allowCreate, assignedId, resolveUnit]);
    const assignedUnit = assignedId !== undefined && resolved?.id === assignedId ? resolved.unit : null;

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
    const unitEntry = (option: IdUnitOption): MenuEntry => ({
        key: `unit-${option.id}`,
        kind: 'unit',
        unit: option,
        label: option.name ?? t('idAllocationField.unitNumber', 'Nr. {{id}}', { id: option.id }),
        secondary: [t('idAllocationField.unitNumber', 'Nr. {{id}}', { id: option.id }), ...(option.topics ?? [])].join(
            ' · ',
        ),
    });
    const typedUnit = typedId !== undefined && resolved?.id === typedId ? resolved.unit : undefined;
    if (allowCreate && typedId !== undefined) {
        entries.push({
            key: `typed-${typedId}`,
            kind: 'typed',
            id: typedId,
            label: t('idAllocationField.useTypedNew', 'Nummer {{id}} verwenden', { id: typedId }),
        });
    }
    const offered = allowCreate ? assignedUnit : typedUnit;
    if (offered && !results.some((option) => option.id === offered.id)) entries.push(unitEntry(offered));
    results.forEach((option) => entries.push(unitEntry(option)));
    const noMatches = searchUnits != null && trimmed !== '' && typedId === undefined && results.length === 0;
    const noUnitWithNumber = !allowCreate && typedUnit === null;

    const isSelected = (entry: MenuEntry) => {
        if (entry.kind === 'create') return mode === 'auto';
        if (entry.kind === 'unit') return mode === 'existing' && unit?.id === entry.unit.id;
        return mode !== 'auto' && value === entry.id;
    };

    // Portal: the invite row scrolls and would clip an in-place menu.
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

    // Leaving the field right after typing a number must not drop the pending lookup.
    const leaveField = () => {
        if (!allowCreate && typedId !== undefined && resolved?.id !== typedId) lookUpTyped(typedId);
        closeMenu();
    };

    const choose = (entry: MenuEntry) => {
        if (entry.kind === 'create') allocation.resetToAuto();
        else if (entry.kind === 'unit') allocation.selectExisting(entry.unit);
        else allocation.setManualValue(entry.id);
        closeMenu();
    };

    const handleTextChange = (raw: string) => {
        setQuery(raw);
        setActiveIndex(0);
        lookupToken.current += 1;
        if (!open) setOpen(true);
        const typed = raw.trim();
        // A new number is checked while the admin keeps typing; an existing-only field waits for the lookup.
        if (allowCreate && DIGITS.test(typed)) allocation.setManualValue(Number(typed));
        // A cleared number was never confirmed, so it must not stay pinned.
        else if (allowCreate && typed === '' && mode === 'manual') allocation.setManualValue(undefined);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (!open) {
            // Combobox pattern: the arrows open the list; only the ⌄/^ buttons step the number.
            if (event.key === 'Enter' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
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
        assigned: assignedUnit
            ? t('idAllocationField.assignedExisting', 'Nr. {{id}} ist „{{name}}“ – zum Einladen im Menü übernehmen.', {
                  id: assignedUnit.id,
                  name: assignedUnit.name ?? assignedUnit.id,
              })
            : t('idAllocationField.assigned', 'Diese ID ist bereits vergeben.'),
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
                    onBlur: leaveField,
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
                                // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- combobox: keys stay in the input
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
                        {noUnitWithNumber && (
                            <li aria-disabled className={styles.empty} role="option" aria-selected={false}>
                                {t('idAllocationField.noUnitWithNumber', 'Keine Einheit mit Nr. {{id}}', {
                                    id: typedId,
                                })}
                            </li>
                        )}
                    </ul>,
                    document.body,
                )}
        </div>
    );
};

export default IdAllocationField;
