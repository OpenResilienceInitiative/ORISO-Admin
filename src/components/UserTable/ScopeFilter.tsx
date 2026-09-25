import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { useTranslation } from 'react-i18next';
import { muiFieldSx } from '../mui/fieldSx';
import type { ScopeKind } from './ScopeChip';
import styles from './scopeFilter.module.scss';

export interface ScopeFilterOption {
    id: string;
    name: string;
    /** Second line, e.g. "20095 Hamburg". */
    detail?: string;
}

export interface ScopeFilterProps {
    kind: ScopeKind;
    options: ScopeFilterOption[];
    /** Selected ids; at most one unless `multiple`. */
    value: string[];
    onChange: (ids: string[]) => void;
    multiple?: boolean;
    disabled?: boolean;
    loading?: boolean;
}

const LABEL_FALLBACKS = { tenant: 'Träger', agency: 'Beratungsstelle' } as const;

/** Searchable Träger or BST picker for the users toolbar. */
export const ScopeFilter = ({ kind, options, value, onChange, multiple, disabled, loading }: ScopeFilterProps) => {
    const { t } = useTranslation();
    const label = t(`userTable.filter.${kind}`, LABEL_FALLBACKS[kind]);
    // An id the options do not know (yet) keeps a placeholder, so the selection never silently drops.
    const selected = value.map((id) => options.find((option) => option.id === id) ?? { id, name: id });

    return (
        <Autocomplete<ScopeFilterOption, boolean>
            className={styles.filter}
            multiple={multiple}
            limitTags={1}
            size="small"
            disabled={disabled}
            loading={loading}
            options={options}
            value={multiple ? selected : selected[0] ?? null}
            onChange={(_, next) => {
                const list = Array.isArray(next) ? next : next ? [next] : [];
                onChange(list.map((option) => option.id));
            }}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, current) => option.id === current.id}
            filterOptions={(list, { inputValue }) => {
                const needle = inputValue.trim().toLowerCase();
                return needle
                    ? list.filter((option) => `${option.name} ${option.detail ?? ''}`.toLowerCase().includes(needle))
                    : list;
            }}
            renderOption={({ key, ...props }, option) => (
                <li key={key} {...props}>
                    <span className={styles.option}>
                        <span>{option.name}</span>
                        {option.detail && <span className={styles.detail}>{option.detail}</span>}
                    </span>
                </li>
            )}
            renderInput={(params) => <TextField {...params} label={label} />}
            sx={muiFieldSx(disabled)}
        />
    );
};
