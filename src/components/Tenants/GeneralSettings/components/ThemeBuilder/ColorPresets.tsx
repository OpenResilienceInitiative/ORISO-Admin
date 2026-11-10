import { useId } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { normalizeHexColor } from '../../../../../utils/colorContrastRating';
import styles from './styles.module.scss';

/**
 * Suggested dark accent colours (#1374, canvas „Erscheinungsbild“). A preset sets only the
 * dark accent seed; the light accent and the error colour stay as they are.
 *
 * Only colours the palette engine can work with are offered: black and the warm greys from
 * the canvas fall below the Frontend's `TOO_PALE_CHROMA`, so they could not be saved
 * (`brandSeedCannotYieldPalette`). A unit test keeps it that way.
 */
export const THEME_PRESETS = [
    { key: 'caritasRed', hex: '#a5000a' },
    { key: 'blue', hex: '#00639b' },
    { key: 'violet', hex: '#6b4fa0' },
    { key: 'orange', hex: '#c25e00' },
    { key: 'berry', hex: '#b1005e' },
] as const;

interface ColorPresetsProps {
    /** Current dark accent seed. */
    value?: string;
    onChange: (hex: string) => void;
    disabled?: boolean;
}

/**
 * Tap-to-pick circles for the dark accent colour. Native radio buttons carry the semantics,
 * so arrow keys move between the colours and screen readers announce each one as a choice.
 * The colour field above stays the way to pick any other colour („Eigene Farbe“).
 */
export const ColorPresets = ({ value, onChange, disabled = false }: ColorPresetsProps) => {
    const { t } = useTranslation();
    const groupName = useId();
    const legendId = useId();
    const current = normalizeHexColor(value);
    const selected = THEME_PRESETS.find((preset) => preset.hex === current);
    const selectedName = selected ? t(`theme.builder.presets.${selected.key}`) : t('theme.builder.presets.custom');

    return (
        <fieldset
            className={classNames(styles.presets, { [styles.presetsDisabled]: disabled })}
            disabled={disabled}
            role="radiogroup"
            aria-labelledby={legendId}
        >
            <legend id={legendId} className={styles.presetsLegend}>
                {t('theme.builder.presets.legend')}
            </legend>
            <div className={styles.presetOptions}>
                {THEME_PRESETS.map((preset) => {
                    const name = t(`theme.builder.presets.${preset.key}`);
                    const inputId = `${groupName}-${preset.key}`;
                    return (
                        <label key={preset.key} htmlFor={inputId} className={styles.presetOption} title={name}>
                            <input
                                id={inputId}
                                type="radio"
                                className={styles.presetInput}
                                name={groupName}
                                value={preset.hex}
                                checked={selected?.key === preset.key}
                                disabled={disabled}
                                onChange={() => onChange(preset.hex)}
                            />
                            <span
                                className={styles.presetCircle}
                                style={{ backgroundColor: preset.hex }}
                                aria-hidden="true"
                            />
                            <span className={styles.presetName}>{name}</span>
                        </label>
                    );
                })}
            </div>
            <p className={styles.presetStatus} data-testid="preset-status">
                {selectedName}
                {current ? ` · ${current.toUpperCase()}` : ''}
            </p>
        </fieldset>
    );
};
