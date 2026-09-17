import { useMemo } from 'react';
import { Dropdown, type MenuProps } from 'antd';
import classNames from 'classnames';
import styles from './styles.module.scss';

export interface InputChipOption {
    value: number;
    label: string;
}

export interface InputChipPickerProps {
    /** Everything that may be chosen; the selected ones render as chips. */
    options: InputChipOption[];
    /** Selected values, in chip order. */
    value: number[];
    onChange: (next: number[]) => void;
    /** Label of the "+" chip that opens the menu of the remaining options. */
    addLabel: string;
    /** Accessible name of a chip's trailing x, e.g. `(label) => \`${label} entfernen\``. */
    removeLabel: (label: string) => string;
    /** Accessible name of the chip list. */
    ariaLabel?: string;
    disabled?: boolean;
    className?: string;
}

const CloseIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path
            d="M13.5 5.56 12.44 4.5 9 7.94 5.56 4.5 4.5 5.56 7.94 9 4.5 12.44l1.06 1.06L9 10.06l3.44 3.44 1.06-1.06L10.06 9z"
            fill="currentColor"
        />
    </svg>
);

const PlusIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M9.75 3.75h-1.5v4.5h-4.5v1.5h4.5v4.5h1.5v-4.5h4.5v-1.5h-4.5z" fill="currentColor" />
    </svg>
);

/**
 * M3 input-chip picker: the selection is a row of input chips, each with a
 * trailing x that removes it, followed by one assist chip ("+ …") that opens a
 * menu of the options not selected yet. Owner decision 2026-09-17 for the
 * counsellor onboarding topics: preselected topics can be dropped, further
 * platform-defined topics added — no dropdown select, no checkbox grid.
 */
export const InputChipPicker = ({
    options,
    value,
    onChange,
    addLabel,
    removeLabel,
    ariaLabel,
    disabled = false,
    className,
}: InputChipPickerProps) => {
    const byValue = useMemo(() => new Map(options.map((option) => [option.value, option])), [options]);
    const selected = value.map((id) => byValue.get(id)).filter((option): option is InputChipOption => option != null);
    const remaining = options.filter((option) => !value.includes(option.value));

    const menuItems: MenuProps['items'] = remaining.map((option) => ({
        key: String(option.value),
        label: option.label,
    }));

    return (
        <div className={classNames(styles.row, className)} role="list" aria-label={ariaLabel}>
            {selected.map((option) => (
                <span key={option.value} role="listitem" className={styles.chip} data-testid="input-chip">
                    <span className={styles.label}>{option.label}</span>
                    <button
                        type="button"
                        className={styles.remove}
                        aria-label={removeLabel(option.label)}
                        disabled={disabled}
                        onClick={() => onChange(value.filter((id) => id !== option.value))}
                    >
                        <CloseIcon />
                    </button>
                </span>
            ))}
            {remaining.length > 0 && (
                <Dropdown
                    trigger={['click']}
                    disabled={disabled}
                    menu={{
                        items: menuItems,
                        onClick: ({ key }) => onChange([...value, Number(key)]),
                    }}
                    overlayClassName={styles.menu}
                >
                    <button type="button" className={styles.add} aria-haspopup="menu" disabled={disabled}>
                        <PlusIcon />
                        <span className={styles.label}>{addLabel}</span>
                    </button>
                </Dropdown>
            )}
        </div>
    );
};

export default InputChipPicker;
