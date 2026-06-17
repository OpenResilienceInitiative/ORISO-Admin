import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { ReactComponent as PenIcon } from '../../resources/img/svg/pen.svg';
import styles from './styles.module.scss';

interface EditButtonProps {
    className?: string;
    disabled?: boolean;
    icon?: React.ReactChild;
    label?: string;
    labelKey?: string;
    onClick?: () => void;
    showLabel?: boolean;
}

export const EditButton = ({
    className,
    disabled,
    icon,
    label,
    labelKey = 'edit',
    onClick,
    showLabel = true,
}: EditButtonProps) => {
    const { t } = useTranslation();
    const finalLabel = label || t(labelKey);

    return (
        <button
            aria-label={finalLabel}
            className={classNames(styles.editButton, { [styles.iconOnly]: !showLabel }, className)}
            disabled={disabled}
            onClick={onClick}
            type="button"
        >
            {icon || <PenIcon />}
            {showLabel && <span>{finalLabel}</span>}
        </button>
    );
};
