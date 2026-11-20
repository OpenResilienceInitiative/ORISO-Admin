import classNames from 'classnames';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useTranslation } from 'react-i18next';
import { ReactComponent as PenIcon } from '../../resources/img/svg/pen.svg';
import styles from './styles.module.scss';

interface EditButtonProps {
    className?: string;
    disabled?: boolean;
    icon?: React.ReactElement<any> | number | string;
    label?: string;
    labelKey?: string;
    onClick?: () => void;
    showLabel?: boolean;
    /**
     * The viewer may only read: a lock instead of the pen and a not-allowed cursor. Unlike
     * `disabled` it stays focusable (`aria-disabled`), so a tooltip around it can say why.
     */
    locked?: boolean;
    /** Set by a wrapping `M3Tooltip` so its explanation is announced with the button. */
    'aria-describedby'?: string;
}

export const EditButton = ({
    className,
    disabled,
    icon,
    label,
    labelKey = 'edit',
    onClick,
    showLabel = true,
    locked = false,
    'aria-describedby': ariaDescribedBy,
}: EditButtonProps) => {
    const { t } = useTranslation();
    const finalLabel = label || t(labelKey);

    return (
        <button
            aria-label={finalLabel}
            aria-describedby={ariaDescribedBy}
            aria-disabled={locked || undefined}
            className={classNames(
                styles.editButton,
                { [styles.iconOnly]: !showLabel, [styles.locked]: locked },
                className,
            )}
            disabled={disabled}
            onClick={locked ? undefined : onClick}
            type="button"
        >
            {locked ? <LockOutlinedIcon /> : icon || <PenIcon />}
            {showLabel && <span>{finalLabel}</span>}
        </button>
    );
};
