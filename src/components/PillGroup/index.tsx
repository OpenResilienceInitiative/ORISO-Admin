import classNames from 'classnames';
import { Pill } from '../Pill';
import styles from './styles.module.scss';

export interface PillOption {
    value: string;
    label: string;
    /** Locked options stay selected and cannot be toggled (e.g. default language). */
    locked?: boolean;
}

export interface PillGroupProps {
    options: PillOption[];
    /** Selected values (always an array; single-select callers pass at most one). */
    value: string[];
    onChange: (next: string[]) => void;
    mode?: 'single' | 'multiple';
    className?: string;
}

/**
 * M3 pill group (Figma Admin.ORISO — Languages / language selector). A wrap of
 * selectable <Pill>s, single- or multi-select. Locked options are always on.
 */
export const PillGroup = ({ options, value, onChange, mode = 'multiple', className }: PillGroupProps) => {
    const toggle = (option: PillOption) => {
        if (option.locked) return;
        if (mode === 'single') {
            onChange([option.value]);
            return;
        }
        onChange(value.includes(option.value) ? value.filter((v) => v !== option.value) : [...value, option.value]);
    };

    return (
        <div className={classNames(styles.group, className)}>
            {options.map((option) => (
                <Pill
                    key={option.value}
                    label={option.label}
                    locked={option.locked}
                    selected={value.includes(option.value)}
                    onClick={() => toggle(option)}
                />
            ))}
        </div>
    );
};
