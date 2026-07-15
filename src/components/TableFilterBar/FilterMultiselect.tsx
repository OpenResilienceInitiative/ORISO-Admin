import { forwardRef, useId, useState, type ReactNode } from 'react';
import { DownOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import classNames from 'classnames';
import type { FilterOption } from './FilterSelect';
import styles from './styles.module.scss';

export interface FilterMultiselectProps {
    /** Facet name shown as the label. */
    label: string;
    /** Leading icon (typically an antd icon). */
    icon?: ReactNode;
    options: FilterOption[];
    value?: string[];
    disabled?: boolean;
    onChange?: (value: string[]) => void;
    className?: string;
}

/**
 * A bordered multi-select filter, drawn as a split pill (see {@link FilterSelect}).
 * The menu stays open while options are toggled (antd renders a checkmark per
 * selected item); once anything is picked the content turns brand-red and a count
 * badge appears. Standalone and composable inside `TableFilterBar`.
 */
export const FilterMultiselect = forwardRef<HTMLButtonElement, FilterMultiselectProps>(function FilterMultiselect(
    { label, icon, options, value, disabled = false, onChange, className },
    ref,
) {
    const [open, setOpen] = useState(false);
    const menuId = useId();
    const isOpen = open && !disabled;
    const selectedKeys = value ?? [];
    const hasValue = selectedKeys.length > 0;

    const items: MenuProps['items'] = options.map((option) => ({ key: option.value, label: option.label }));

    return (
        <Dropdown
            trigger={['click']}
            open={isOpen}
            onOpenChange={setOpen}
            disabled={disabled}
            menu={{
                id: menuId,
                items,
                selectable: true,
                multiple: true,
                selectedKeys,
                onSelect: ({ selectedKeys: keys }) => onChange?.(keys as string[]),
                onDeselect: ({ selectedKeys: keys }) => onChange?.(keys as string[]),
            }}
        >
            <button
                ref={ref}
                type="button"
                disabled={disabled}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-controls={isOpen ? menuId : undefined}
                className={classNames(
                    styles.split,
                    {
                        [styles.splitSelected]: hasValue,
                        [styles.splitOpen]: isOpen,
                        [styles.splitDisabled]: disabled,
                    },
                    className,
                )}
            >
                <span className={styles.splitMain}>
                    {icon && (
                        <span className={styles.icon} aria-hidden>
                            {icon}
                        </span>
                    )}
                    <span className={hasValue ? styles.label : styles.placeholder}>{label}</span>
                    {hasValue && (
                        <span className={styles.count} aria-label={`${selectedKeys.length} ausgewählt`}>
                            {selectedKeys.length}
                        </span>
                    )}
                </span>
                <span className={styles.splitCaret} aria-hidden>
                    <span className={classNames(styles.chevron, { [styles.chevronOpen]: isOpen })}>
                        <DownOutlined />
                    </span>
                </span>
            </button>
        </Dropdown>
    );
});

export default FilterMultiselect;
