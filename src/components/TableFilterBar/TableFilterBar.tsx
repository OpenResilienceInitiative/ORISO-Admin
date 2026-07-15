import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { CloseOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import styles from './styles.module.scss';

export interface TableFilterBarProps {
    /** Accessible name for the search/filter region. */
    ariaLabel: string;
    /** Filter segments — typically `FilterInput` / `FilterSelect` / `FilterMultiselect`. */
    children?: ReactNode;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    searchPlaceholder?: string;
    /** Accessible label for the search field (defaults to the placeholder / a generic label). */
    searchAriaLabel?: string;
    /** Start with the search field expanded. */
    defaultSearchExpanded?: boolean;
    className?: string;
}

/**
 * The global table-listing filter bar (Figma nodes 1165-16538 / 16407 / 16926):
 * a single rounded, segmented bar. The first segment is a caret + search toggle
 * that expands an auto-focusing search field; the remaining segments are the
 * caller's filter fields. First segment rounds on the left, last on the right,
 * and inner borders collapse into shared dividers.
 */
export const TableFilterBar = ({
    ariaLabel,
    children,
    searchValue = '',
    onSearchChange,
    searchPlaceholder,
    searchAriaLabel,
    defaultSearchExpanded = false,
    className,
}: TableFilterBarProps) => {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(defaultSearchExpanded);
    const inputRef = useRef<HTMLInputElement>(null);
    const searchId = useId();

    // Focus the field as soon as it opens (but not on the initial mount when it
    // starts expanded, to avoid stealing focus on page load).
    const didMount = useRef(false);
    useEffect(() => {
        if (!didMount.current) {
            didMount.current = true;
            return;
        }

        if (expanded) {
            inputRef.current?.focus();
        }
    }, [expanded]);

    const placeholder = searchPlaceholder ?? t('search-placeholder', 'Suchen …');

    return (
        <div className={classNames(styles.bar, className)} role="search" aria-label={ariaLabel}>
            <div className={classNames(styles.pill, styles.searchZone, { [styles.pillFocused]: expanded })}>
                <button
                    type="button"
                    className={styles.searchToggle}
                    aria-expanded={expanded}
                    aria-controls={searchId}
                    aria-label={t('tableFilter.toggleSearch', 'Suche ein-/ausklappen')}
                    onClick={() => setExpanded((prev) => !prev)}
                >
                    <span
                        className={classNames(styles.searchCaret, { [styles.searchCaretOpen]: expanded })}
                        aria-hidden
                    >
                        <RightOutlined />
                    </span>
                    <span className={styles.searchIcon} aria-hidden>
                        <SearchOutlined />
                    </span>
                </button>
                <div className={classNames(styles.searchReveal, { [styles.searchRevealOpen]: expanded })}>
                    <input
                        ref={inputRef}
                        id={searchId}
                        className={classNames(styles.input, styles.searchInput)}
                        type="text"
                        hidden={!expanded}
                        aria-label={searchAriaLabel ?? placeholder}
                        placeholder={placeholder}
                        value={searchValue}
                        onChange={(event) => onSearchChange?.(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                                setExpanded(false);
                            }
                        }}
                    />
                    {searchValue.length > 0 && (
                        <button
                            type="button"
                            className={styles.searchClear}
                            hidden={!expanded}
                            aria-label={t('searchInput.clear', 'Suche löschen')}
                            onClick={() => {
                                onSearchChange?.('');
                                inputRef.current?.focus();
                            }}
                        >
                            <CloseOutlined />
                        </button>
                    )}
                </div>
            </div>
            {children}
        </div>
    );
};

export default TableFilterBar;
