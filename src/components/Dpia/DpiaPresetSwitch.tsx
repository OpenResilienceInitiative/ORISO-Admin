import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import type { CompliancePreset } from './dpiaContent';
import styles from './styles.module.scss';

const PRESET_VALUES: CompliancePreset[] = ['kdg', 'dsgvo'];

export const DpiaPresetSwitch = ({
    preset,
    onChange,
    label = 'Compliance-Preset',
}: {
    preset: CompliancePreset;
    onChange: (preset: CompliancePreset) => void;
    label?: string;
}) => {
    const segmentRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const handlePresetKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        let nextIndex: number | null = null;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            nextIndex = (index + 1) % PRESET_VALUES.length;
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            nextIndex = (index - 1 + PRESET_VALUES.length) % PRESET_VALUES.length;
        } else if (event.key === 'Home') {
            nextIndex = 0;
        } else if (event.key === 'End') {
            nextIndex = PRESET_VALUES.length - 1;
        }
        if (nextIndex === null) return;
        event.preventDefault();
        onChange(PRESET_VALUES[nextIndex]);
        segmentRefs.current[nextIndex]?.focus();
    };

    return (
        <span className={styles.segmented} role="radiogroup" aria-label={label}>
            {PRESET_VALUES.map((value, index) => (
                <button
                    key={value}
                    ref={(el) => {
                        segmentRefs.current[index] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={preset === value}
                    tabIndex={preset === value ? 0 : -1}
                    className={[styles.segment, preset === value ? styles.segmentActive : ''].join(' ')}
                    onClick={() => onChange(value)}
                    onKeyDown={(event) => handlePresetKeyDown(event, index)}
                >
                    {value === 'kdg' ? 'KDG' : 'DSGVO'}
                </button>
            ))}
        </span>
    );
};
