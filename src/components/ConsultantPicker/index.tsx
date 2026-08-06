import { useMemo, useState } from 'react';
import classNames from 'classnames';
import { FloatingLabelInput } from '../FloatingLabelInput';
import { FilterChip } from '../FilterChip';
import { M3Button } from '../M3Button';
import { ReactComponent as AddIcon } from '../../resources/img/svg/add.svg';
import styles from './styles.module.scss';

export interface ConsultantOption {
    id: string;
    name: string;
}

export interface ConsultantPickerProps {
    /** All assignable consultants (existing accounts). */
    consultants: ConsultantOption[];
    /** Ids of the currently selected consultants. */
    selectedIds: string[];
    onChange: (next: string[]) => void;
    /** Shown on the search field. */
    searchLabel: string;
    /** Renders the "create new consultant" affordance when provided. */
    onCreateNew?: () => void;
    createLabel?: string;
    className?: string;
}

/**
 * Multi-select over existing consultants (Design-System decision 2026-07-20):
 * a search field narrows the candidates, people toggle as M3 FilterChips —
 * selected chips stay pinned in front even when they no longer match the
 * query, so the current assignment is always visible. Optionally offers a
 * "create new consultant" action for people that don't exist yet.
 *
 * Pure primitive assembly (FloatingLabelInput + FilterChip + M3Button);
 * selection state lives with the caller.
 */
export const ConsultantPicker = ({
    consultants,
    selectedIds,
    onChange,
    searchLabel,
    onCreateNew,
    createLabel,
    className,
}: ConsultantPickerProps) => {
    const [query, setQuery] = useState('');

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        const selected = consultants.filter((c) => selectedIds.includes(c.id));
        const unselected = consultants.filter(
            (c) => !selectedIds.includes(c.id) && (!q || c.name.toLowerCase().includes(q)),
        );
        return [...selected, ...unselected];
    }, [consultants, selectedIds, query]);

    const toggle = (id: string, next: boolean) => {
        onChange(next ? [...selectedIds, id] : selectedIds.filter((selectedId) => selectedId !== id));
    };

    return (
        <div className={classNames(styles.picker, className)}>
            <FloatingLabelInput label={searchLabel} value={query} onChange={(event) => setQuery(event.target.value)} />
            <div className={styles.chips} role="listbox" aria-label={searchLabel} aria-multiselectable>
                {visible.map((consultant) => (
                    <FilterChip
                        key={consultant.id}
                        label={consultant.name}
                        selected={selectedIds.includes(consultant.id)}
                        onChange={(next) => toggle(consultant.id, next)}
                    />
                ))}
            </div>
            {onCreateNew && createLabel && (
                <M3Button variant="outlined" icon={<AddIcon />} onClick={onCreateNew} className={styles.createButton}>
                    {createLabel}
                </M3Button>
            )}
        </div>
    );
};

export default ConsultantPicker;
