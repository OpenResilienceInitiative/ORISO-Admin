import React, { useEffect, useId, useState } from 'react';

import { HexColorInput, HexColorPicker } from 'react-colorful';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import useComponentVisible from '../../hooks/useComponentVisible';
import { ContrastBadge } from '../ContrastBadge';
import { normalizeHexColor } from '../../utils/colorContrastRating';
import styles from './styles.module.scss';

interface ColorSelectorProps {
    isLoading: boolean;
    label: string;
    tenantColor: string;
    field: string;
    setColorValue: (field: string, color: string) => void;
    /** Show the WCAG contrast badge next to the hex code (#1374). */
    showContrast?: boolean;
    /** One line under the label saying what the colour is used for (#1374). */
    description?: string;
}

/** Hex digits typed so far, without `#` or anything `HexColorInput` would strip. */
const hexDigits = (value: string) => value.replace(/[^0-9a-f]/gi, '');

const ColorSelector = ({
    isLoading,
    label,
    tenantColor,
    setColorValue,
    field,
    showContrast,
    description,
}: ColorSelectorProps) => {
    const { t } = useTranslation();
    const [selectedColor, setSelectedColor] = useState(tenantColor);
    const [hexInvalid, setHexInvalid] = useState(false);
    const { ref, isComponentVisible, setIsComponentVisible } = useComponentVisible();
    const hexInputId = useId();
    const hexErrorId = useId();

    const handleOnChange = (color: string) => {
        setSelectedColor(color);
        setColorValue(field, color);
    };

    // `HexColorInput` only reports complete 3- or 6-digit codes and reverts
    // anything else on blur; this tracks the in-between state so the field can
    // say what is wrong instead of silently ignoring the input.
    const handleHexInput = (event: React.FormEvent<HTMLInputElement>) => {
        const { length } = hexDigits(event.currentTarget.value);
        setHexInvalid(length > 0 && length !== 3 && length !== 6);
    };

    // Shorthand is fine while typing, but store the canonical 6-digit form.
    const handleHexBlur = () => {
        setHexInvalid(false);
        const normalized = normalizeHexColor(selectedColor);
        if (normalized && selectedColor && normalized !== selectedColor.toLowerCase()) {
            handleOnChange(normalized);
        }
    };

    useEffect(() => {
        setSelectedColor(tenantColor);
    }, [tenantColor]);

    return (
        <div className="colorSelector" ref={ref}>
            <button
                type="button"
                disabled={isLoading}
                className="colorIndicator"
                style={{ backgroundColor: selectedColor }}
                aria-label={label}
                aria-expanded={isComponentVisible}
                onClick={() => setIsComponentVisible(!isComponentVisible)}
            />
            <div>
                <span>{label}</span>
                {/* A <p>, not a <span>: the field stylesheets restyle `.colorSelector span`. */}
                {description && (
                    <p className={classNames('colorSelector__description', styles.description)}>{description}</p>
                )}
                <div className={styles.valueRow}>
                    {/* Plain `h4` — it used to be antd's `Title level={4}`, and the
                        surrounding stylesheets hook it as `.colorSelector h4`.
                        MuiColorField supplies the baseline type those sheets override. */}
                    <h4>HEX {selectedColor ? selectedColor.toUpperCase() : '–'}</h4>
                    {showContrast && <ContrastBadge color={selectedColor} />}
                </div>
            </div>
            {isComponentVisible && (
                <div className="pickerWrapper">
                    <HexColorPicker color={selectedColor || ''} onChange={(color) => handleOnChange(color)} />
                    <div className={styles.hexField}>
                        {/* Visual caption only; the input's aria-label names it in full. A div,
                            not a span: the field stylesheets restyle `.colorSelector span`. */}
                        <div className={styles.hexLabel} aria-hidden="true">
                            HEX
                        </div>
                        <HexColorInput
                            id={hexInputId}
                            className={styles.hexInput}
                            color={selectedColor || ''}
                            prefixed
                            aria-label={t('colorSelector.hexInput', { label })}
                            aria-invalid={hexInvalid || undefined}
                            aria-describedby={hexInvalid ? hexErrorId : undefined}
                            onInput={handleHexInput}
                            onBlur={handleHexBlur}
                            onChange={handleOnChange}
                        />
                    </div>
                    {hexInvalid && (
                        <p id={hexErrorId} className={styles.hexError} role="alert">
                            {t('colorSelector.hexInvalid')}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default ColorSelector;
