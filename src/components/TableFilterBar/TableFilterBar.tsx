import { type ReactNode } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { FloatingSearch } from '../FloatingSearch';
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
 * a row of separate rounded pills, opening with a {@link FloatingSearch} (the
 * arrow toggle spins 360° and expands an auto-focusing field, pushing siblings
 * right) followed by the caller's filter fields. When wider than the viewport the
 * row scrolls horizontally with a slim hover-revealed scrollbar.
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
    const placeholder = searchPlaceholder ?? t('search-placeholder', 'Suchen …');

    return (
        <div className={classNames(styles.bar, className)} role="search" aria-label={ariaLabel}>
            <FloatingSearch
                ariaLabel={searchAriaLabel ?? placeholder}
                placeholder={placeholder}
                value={searchValue}
                onValueChange={onSearchChange}
                defaultExpanded={defaultSearchExpanded}
            />
            {children}
        </div>
    );
};

export default TableFilterBar;
