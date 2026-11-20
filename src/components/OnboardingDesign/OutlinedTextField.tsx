import { useId } from 'react';
import styles from './styles.module.scss';

export interface OutlinedTextFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    autoComplete?: string;
    /** Id of a hint element describing the field. */
    describedBy?: string;
}

/** Text field with the label notched into the outline (M3 outlined). */
export const OutlinedTextField = ({ label, value, onChange, autoComplete, describedBy }: OutlinedTextFieldProps) => {
    const id = useId();
    return (
        <div className={styles.outlined}>
            <label className={styles.outlinedLabel} htmlFor={id}>
                {label}
            </label>
            <input
                id={id}
                className={styles.outlinedInput}
                type="text"
                value={value}
                autoComplete={autoComplete}
                aria-describedby={describedBy}
                onChange={(event) => onChange(event.target.value)}
            />
        </div>
    );
};
