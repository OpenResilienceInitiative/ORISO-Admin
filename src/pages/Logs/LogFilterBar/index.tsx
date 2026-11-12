import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@mui/material/Button';
import { FilterDisclosure } from '../../../components/FilterDisclosure';
import { GlobalSearchBar } from '../../../components/GlobalSearch';
import styles from './styles.module.scss';

export interface LogFilterBarProps {
    /** The ID search, always visible next to the "Filter" button. */
    search: {
        label: string;
        value: string;
        onChange: (value: string) => void;
        onSearch: (value: string) => void;
    };
    /** The selects that fold out below the button. */
    children: ReactNode;
    /** Set selects plus an applied ID search; shown on the button. */
    activeCount: number;
    onReset: () => void;
}

/** The one filter bar of every log page: ID search, a "Filter" button with the selects, one reset (Admin#1510). */
export const LogFilterBar = ({ search, children, activeCount, onReset }: LogFilterBarProps) => {
    const { t } = useTranslation();

    return (
        <FilterDisclosure
            className={styles.bar}
            groupLabel={t('logs.filters.label', 'Protokoll filtern')}
            activeCount={activeCount}
            leading={
                <GlobalSearchBar
                    ariaLabel={search.label}
                    defaultExpanded
                    expandedWidth={320}
                    searchPlaceholder={search.label}
                    value={search.value}
                    onSearchChange={search.onChange}
                    onSearch={search.onSearch}
                />
            }
            trailing={
                activeCount > 0 && (
                    <Button
                        // No MUI theme in the app: without this the text falls back to MUI blue (4.39:1, fails AA).
                        sx={{ color: 'var(--m3-primary, #a5000a)', textTransform: 'none' }}
                        variant="text"
                        onClick={onReset}
                    >
                        {t('logs.filters.reset', 'Filter zurücksetzen')}
                    </Button>
                )
            }
        >
            {children}
        </FilterDisclosure>
    );
};
