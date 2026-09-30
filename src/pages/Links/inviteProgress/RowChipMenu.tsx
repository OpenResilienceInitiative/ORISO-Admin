import { useState, type ReactNode } from 'react';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CheckIcon from '@mui/icons-material/Check';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import classNames from 'classnames';
import { M3Tooltip } from '../../../components/M3Tooltip';
import styles from './inviteProgressBoard.module.scss';

export interface RowChipOption {
    key: string;
    title: string;
    /** One line under the title; a disabled option says here why it is off. */
    description?: string;
    checked?: boolean;
    disabled?: boolean;
    /** Replaces the title/description block, e.g. a link out of the menu. */
    content?: ReactNode;
}

export interface RowChipMenuProps {
    /** Visible chip text, e.g. "Themen: Auswählen". */
    label: string;
    /** Accessible name, e.g. "Themen für Anke Roth: Auswählen". */
    ariaLabel: string;
    tooltip: string;
    options: Array<RowChipOption | 'divider'>;
    disabled?: boolean;
    className?: string;
    onSelect: (key: string) => void;
}

/** A table chip that opens an M3 menu: the topic permission and the role chip of an invite row. */
export const RowChipMenu = ({
    label,
    ariaLabel,
    tooltip,
    options,
    disabled = false,
    className,
    onSelect,
}: RowChipMenuProps) => {
    const [open, setOpen] = useState(false);

    const items: MenuProps['items'] = options.map((option, index) =>
        option === 'divider'
            ? // eslint-disable-next-line react/no-array-index-key -- dividers have no identity of their own
              { type: 'divider' as const, key: `divider-${index}` }
            : {
                  key: option.key,
                  disabled: option.disabled,
                  label: option.content ?? (
                      <span className={styles.topicOption}>
                          <span className={styles.topicOptionCheck} aria-hidden>
                              {option.checked && <CheckIcon fontSize="inherit" />}
                          </span>
                          <span className={styles.topicOptionText}>
                              <span className={styles.topicOptionTitle}>{option.title}</span>
                              {option.description && (
                                  <span className={styles.topicOptionDescription}>{option.description}</span>
                              )}
                          </span>
                      </span>
                  ),
              },
    );
    const checkedKeys = options.flatMap((option) => (option !== 'divider' && option.checked ? [option.key] : []));

    const chip = (
        <button
            type="button"
            className={classNames(styles.topicChip, className, { [styles.topicChipOpen]: open })}
            // aria-disabled instead of disabled: a disabled button swallows the
            // hover and focus the tooltip needs to explain why it is locked.
            aria-disabled={disabled || undefined}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={ariaLabel}
        >
            <span>{label}</span>
            <ArrowDropDownIcon className={styles.topicChipIcon} aria-hidden />
        </button>
    );

    // Dropdown and M3Tooltip both clone their child: the Dropdown gets a span, the tooltip the button.
    return (
        <Dropdown
            open={open && !disabled}
            onOpenChange={(next) => setOpen(disabled ? false : next)}
            trigger={['click']}
            placement="bottomLeft"
            // On a phone the chip sits mid-row: shift the menu back into the
            // viewport instead of letting its right edge run off-screen.
            align={{ overflow: { adjustX: 1, adjustY: 1, shiftX: true } }}
            overlayClassName={styles.topicMenu}
            menu={{
                items,
                selectedKeys: checkedKeys,
                onClick: ({ key }) => {
                    setOpen(false);
                    if (!checkedKeys.includes(key)) onSelect(key);
                },
            }}
        >
            <span className={styles.topicChipAnchor}>
                <M3Tooltip portal text={tooltip}>
                    {chip}
                </M3Tooltip>
            </span>
        </Dropdown>
    );
};
