import Close from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SearchIcon from '@mui/icons-material/Search';
import classNames from 'classnames';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { FilterTarget } from './statisticDashboardData';
import type { ScopeKey } from './types';
import styles from './statisticScopePicker.module.scss';

export interface ScopePickerLevel {
    id: ScopeKey;
    label: string;
    icon: ReactNode;
}

/** A Träger or Beratungsstelle, with the level its numbers are shown on. */
export interface ScopePickerTarget extends FilterTarget {
    scope: ScopeKey;
}

export interface StatisticScopePickerLabels {
    /** Accessible name of the button and the panel, e.g. "Statistik eingrenzen". */
    picker: string;
    levels: string;
    search: string;
    noMatch: string;
    selected: string;
    remove: (target: string) => string;
}

export interface StatisticScopePickerProps {
    levels: ScopePickerLevel[];
    activeLevel: ScopeKey;
    targets: ScopePickerTarget[];
    selectedTargets: FilterTarget[];
    onSelectLevel: (level: ScopeKey) => void;
    onSelectTarget: (target: ScopePickerTarget) => void;
    onRemoveTarget: (targetId: string) => void;
    labels: StatisticScopePickerLabels;
    /** Localises a target's type ("Träger") and detail line. */
    describe: (text: string) => string;
    locale: string;
}

const MAX_RESULTS = 8;
const normalise = (value: string, locale: string) => value.trim().toLocaleLowerCase(locale);

/**
 * One control for "which numbers am I looking at" (Admin#1510): the level (Plattformweit, Träger,
 * Beratungsstellen) and a single Träger or Beratungsstelle used to be two separate controls, tabs and
 * a search, that both narrowed by Träger. Picking a level shows all of it; picking a Träger or
 * Beratungsstelle switches to its level and narrows to it. What is picked stays visible as chips.
 */
export const StatisticScopePicker = ({
    levels,
    activeLevel,
    targets,
    selectedTargets,
    onSelectLevel,
    onSelectTarget,
    onRemoveTarget,
    labels,
    describe,
    locale,
}: StatisticScopePickerProps) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const panelId = useId();
    const listId = useId();

    const level = levels.find((item) => item.id === activeLevel) ?? levels[0];
    const results = useMemo(() => {
        const needle = normalise(query, locale);
        const selectedIds = new Set(selectedTargets.map((target) => target.id));
        return targets
            .filter((target) => !selectedIds.has(target.id))
            .filter(
                (target) =>
                    !needle ||
                    [target.label, describe(target.detail), describe(target.type)].some((text) =>
                        normalise(text, locale).includes(needle),
                    ),
            )
            .slice(0, MAX_RESULTS);
    }, [describe, locale, query, selectedTargets, targets]);

    useEffect(() => setActiveIndex(0), [query]);

    useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node | null)) setOpen(false);
        };
        const onKeyDown = (event: globalThis.KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
                setQuery('');
                buttonRef.current?.focus();
            }
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    useEffect(() => {
        if (open) searchRef.current?.focus();
    }, [open]);

    const close = () => {
        setOpen(false);
        setQuery('');
        buttonRef.current?.focus();
    };

    const pickTarget = (target: ScopePickerTarget) => {
        onSelectTarget(target);
        close();
    };

    const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown' && results.length) {
            event.preventDefault();
            setActiveIndex((index) => (index + 1) % results.length);
        } else if (event.key === 'ArrowUp' && results.length) {
            event.preventDefault();
            setActiveIndex((index) => (index - 1 + results.length) % results.length);
        } else if (event.key === 'Enter' && results[activeIndex]) {
            event.preventDefault();
            pickTarget(results[activeIndex]);
        }
    };

    const summary =
        selectedTargets.length === 0
            ? level?.label
            : `${selectedTargets[0].label}${selectedTargets.length > 1 ? ` +${selectedTargets.length - 1}` : ''}`;

    return (
        <div ref={rootRef} className={styles.root}>
            <button
                ref={buttonRef}
                type="button"
                className={styles.trigger}
                aria-label={`${labels.picker}: ${summary}`}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-controls={open ? panelId : undefined}
                onClick={() => (open ? close() : setOpen(true))}
            >
                <span className={styles.triggerIcon} aria-hidden>
                    {level?.icon}
                </span>
                <span className={styles.triggerText}>{summary}</span>
                <KeyboardArrowDownIcon
                    aria-hidden
                    fontSize="small"
                    className={classNames(styles.chevron, { [styles.chevronOpen]: open })}
                />
            </button>

            {open && (
                <div id={panelId} role="dialog" aria-label={labels.picker} className={styles.panel}>
                    <div role="group" aria-label={labels.levels} className={styles.levels}>
                        {levels.map((item) => {
                            const current = item.id === activeLevel && selectedTargets.length === 0;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    aria-pressed={current}
                                    className={classNames(styles.level, { [styles.levelCurrent]: current })}
                                    onClick={() => {
                                        onSelectLevel(item.id);
                                        close();
                                    }}
                                >
                                    <span aria-hidden className={styles.levelIcon}>
                                        {item.icon}
                                    </span>
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                    {targets.length > 0 && (
                        <>
                            <div className={styles.search}>
                                <SearchIcon aria-hidden fontSize="small" />
                                <input
                                    ref={searchRef}
                                    type="search"
                                    role="combobox"
                                    aria-expanded={results.length > 0}
                                    aria-controls={listId}
                                    aria-activedescendant={
                                        results[activeIndex] ? `${listId}-${results[activeIndex].id}` : undefined
                                    }
                                    aria-label={labels.search}
                                    placeholder={labels.search}
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    onKeyDown={onSearchKeyDown}
                                />
                            </div>
                            <div id={listId} role="listbox" aria-label={labels.search} className={styles.results}>
                                {results.length === 0 && <p className={styles.empty}>{labels.noMatch}</p>}
                                {results.map((target, index) => (
                                    <div
                                        key={target.id}
                                        id={`${listId}-${target.id}`}
                                        role="option"
                                        aria-selected={index === activeIndex}
                                        tabIndex={-1}
                                        className={classNames(styles.result, {
                                            [styles.resultActive]: index === activeIndex,
                                        })}
                                        onMouseEnter={() => setActiveIndex(index)}
                                        onClick={() => pickTarget(target)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') pickTarget(target);
                                        }}
                                    >
                                        <span className={styles.resultText}>
                                            <strong>{target.label}</strong>
                                            <small>{describe(target.detail)}</small>
                                        </span>
                                        <em>{describe(target.type)}</em>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {selectedTargets.length > 0 && (
                <div className={styles.chips} role="group" aria-label={labels.selected}>
                    {selectedTargets.map((target) => (
                        <span key={target.id} className={styles.chip}>
                            <small>{describe(target.type)}</small>
                            <span>{target.label}</span>
                            <button
                                type="button"
                                aria-label={labels.remove(target.label)}
                                onClick={() => onRemoveTarget(target.id)}
                            >
                                <Close aria-hidden />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};
