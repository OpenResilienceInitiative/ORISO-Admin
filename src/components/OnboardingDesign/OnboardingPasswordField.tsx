import { useId, useState } from 'react';
import classNames from 'classnames';
import KeyRounded from '@mui/icons-material/KeyRounded';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';
import styles from './styles.module.scss';

export interface OnboardingPasswordFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    showLabel: string;
    hideLabel: string;
    autoFocus?: boolean;
    className?: string;
}

/** Password field in the registration style: key at the start, eye at the end. */
export const OnboardingPasswordField = ({
    label,
    value,
    onChange,
    showLabel,
    hideLabel,
    autoFocus,
    className,
}: OnboardingPasswordFieldProps) => {
    const id = useId();
    const [visible, setVisible] = useState(false);

    return (
        <div className={classNames(styles.field, className)}>
            <KeyRounded className={styles.fieldLead} aria-hidden />
            <input
                id={id}
                className={styles.fieldInput}
                type={visible ? 'text' : 'password'}
                value={value}
                placeholder={label}
                aria-label={label}
                autoComplete="new-password"
                // eslint-disable-next-line jsx-a11y/no-autofocus -- first field of a single-purpose page
                autoFocus={autoFocus}
                onChange={(event) => onChange(event.target.value)}
            />
            <button
                type="button"
                className={styles.fieldEye}
                aria-label={visible ? hideLabel : showLabel}
                aria-pressed={visible}
                onClick={() => setVisible((current) => !current)}
            >
                {visible ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
            </button>
        </div>
    );
};
