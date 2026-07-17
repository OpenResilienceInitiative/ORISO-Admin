import { useMemo, useState, type ReactNode } from 'react';
import { Dropdown, type DropdownProps, type MenuProps } from 'antd';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { ReactComponent as ChevronDownIcon } from '../../resources/img/svg/oriso/keyboard_arrow_down_24px.svg';
import styles from './styles.module.scss';

export interface PillSelectOption {
    value: string;
    label: string;
}

interface PillSelectCommonProps {
    /** Filter name; shown while nothing is selected and as multi-select summary prefix. */
    label: string;
    options: PillSelectOption[];
    /** Leading icon slot (24px), inherits the pill text colour. Icon-set rule:
     * 200-weight glyph while unselected, `selectedIcon` (filled) once selected. */
    icon?: ReactNode;
    /** Filled glyph shown instead of `icon` while the pill holds a selection. */
    selectedIcon?: ReactNode;
    disabled?: boolean;
    className?: string;
}

export interface PillSelectSingleProps extends PillSelectCommonProps {
    mode?: 'single';
    value?: string | null;
    onChange?: (value: string) => void;
}

export interface PillSelectMultipleProps extends PillSelectCommonProps {
    mode: 'multiple';
    value?: string[];
    onChange?: (value: string[]) => void;
}

export type PillSelectProps = PillSelectSingleProps | PillSelectMultipleProps;

/** Whether a pill (single or multi) currently holds a selection. */
export const hasPillSelection = (pill: PillSelectProps): boolean => {
    if (pill.mode === 'multiple') {
        return (pill.value ?? []).length > 0;
    }

    return pill.value != null && pill.value !== '';
};

const CheckMark = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M7.1 12.3 3.6 8.8l1-1 2.5 2.5 5.3-5.3 1 1z" fill="var(--m3-on-primary, #ffffff)" />
    </svg>
);

/**
 * Material-3 split-pill select — the global default filter control of the admin
 * search (Figma section 1165:17005). A pill consists of a main segment (leading
 * icon + label/value) and a separate chevron segment; both open an antd Dropdown
 * with the options. Empty pills render outlined, pills with a selection render
 * with a light tonal fill and primary-coloured text/icon. Colours come from the
 * M3/OrisoScheme CSS variables only.
 */
export const PillSelect = (props: PillSelectProps) => {
    const { label, options, icon, selectedIcon, disabled = false, className } = props;
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    const isMultiple = props.mode === 'multiple';
    const selectedValues = useMemo(() => {
        if (props.mode === 'multiple') {
            return props.value ?? [];
        }

        return props.value != null && props.value !== '' ? [props.value] : [];
    }, [props.mode, props.value]);

    const hasSelection = selectedValues.length > 0;

    const displayLabel = useMemo(() => {
        if (!hasSelection) {
            return label;
        }

        if (selectedValues.length > 1) {
            return `${label} (${selectedValues.length})`;
        }

        const selected = options.find((option) => option.value === selectedValues[0]);
        return selected?.label ?? selectedValues[0];
    }, [hasSelection, label, options, selectedValues]);

    const items: MenuProps['items'] = options.map((option) => ({
        key: option.value,
        label: isMultiple ? (
            <span className={styles.option}>
                <span
                    className={classNames(styles.optionCheckbox, {
                        [styles.optionCheckboxChecked]: selectedValues.includes(option.value),
                    })}
                    aria-hidden
                >
                    {selectedValues.includes(option.value) && <CheckMark />}
                </span>
                {option.label}
            </span>
        ) : (
            option.label
        ),
    }));

    const handleMenuClick: Required<MenuProps>['onClick'] = ({ key }) => {
        if (props.mode === 'multiple') {
            const current = props.value ?? [];
            const next = current.includes(key) ? current.filter((value) => value !== key) : [...current, key];
            props.onChange?.(next);
            return;
        }

        props.onChange?.(key);
        setOpen(false);
    };

    const handleOpenChange: Required<DropdownProps>['onOpenChange'] = (nextOpen, info) => {
        // Multi-select pills stay open while options are toggled.
        if (isMultiple && info.source === 'menu') {
            return;
        }

        setOpen(nextOpen);
    };

    return (
        <Dropdown
            trigger={['click']}
            disabled={disabled}
            open={!disabled && open}
            onOpenChange={handleOpenChange}
            menu={{
                items,
                onClick: handleMenuClick,
                selectable: true,
                multiple: isMultiple,
                selectedKeys: selectedValues,
            }}
        >
            <span
                className={classNames(
                    styles.pill,
                    {
                        [styles.pillSelected]: hasSelection,
                        [styles.pillOpen]: open && !disabled,
                        [styles.pillDisabled]: disabled,
                    },
                    className,
                )}
            >
                <button
                    type="button"
                    className={classNames(styles.segment, styles.main)}
                    disabled={disabled}
                    aria-haspopup="menu"
                    aria-expanded={!disabled && open}
                >
                    {(icon || selectedIcon) && (
                        <span className={styles.icon} aria-hidden>
                            {hasSelection ? selectedIcon ?? icon : icon}
                        </span>
                    )}
                    <span className={styles.label}>{displayLabel}</span>
                </button>
                <button
                    type="button"
                    className={classNames(styles.segment, styles.chevron)}
                    disabled={disabled}
                    aria-haspopup="menu"
                    aria-expanded={!disabled && open}
                    aria-label={t('pillSelect.toggleOptions', { label })}
                >
                    <ChevronDownIcon className={styles.chevronIcon} aria-hidden />
                </button>
            </span>
        </Dropdown>
    );
};
