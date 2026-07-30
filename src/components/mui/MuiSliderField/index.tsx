import * as React from 'react';
import { useContext } from 'react';
import { Form } from 'antd';
import DisabledContext from 'antd/es/config-provider/DisabledContext';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Slider from '@mui/material/Slider';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import styles from './styles.module.scss';

type FieldName = string | Array<string | number>;
type RangeValue = [number, number];

interface MuiSliderControlProps {
    /** Injected by antd `Form.Item`. */
    value?: RangeValue;
    onChange?: (value: RangeValue) => void;
    fieldName: FieldName;
    label?: string;
    helpText?: string;
    min: number;
    max: number;
    disabled?: boolean;
}

/**
 * Inner MUI range slider. Validation status comes from the surrounding
 * `Form.Item`, the message from the form instance — as in `MuiFormField`.
 */
const MuiSliderControl = ({
    value,
    onChange,
    fieldName,
    label,
    helpText,
    min,
    max,
    disabled,
}: MuiSliderControlProps) => {
    const contextDisabled = useContext(DisabledContext);
    const isDisabled = contextDisabled || disabled;
    const { status } = Form.Item.useStatus();
    const form = Form.useFormInstance();
    const isError = status === 'error';
    const errors = form?.getFieldError(fieldName as any) ?? [];
    const helperText = (isError && errors[0]) || helpText || undefined;

    // The field can be empty before the agency is loaded; fall back to the full range.
    const current: RangeValue = Array.isArray(value) && value.length === 2 ? value : [min, max];

    const handleChange = (_event: Event, next: number | number[]) => {
        onChange?.(next as RangeValue);
    };

    return (
        <FormControl className={styles.control} disabled={isDisabled} error={isError} fullWidth>
            {label && <FormLabel className={styles.label}>{label}</FormLabel>}
            <Slider
                className={styles.slider}
                value={current}
                onChange={handleChange}
                min={min}
                max={max}
                disabled={isDisabled}
                disableSwap
                // antd rendered both handle tooltips permanently open; `on` is the
                // MUI equivalent, and the marks reproduce the min/max end labels.
                valueLabelDisplay="on"
                marks={[
                    { value: min, label: String(min) },
                    { value: max, label: String(max) },
                ]}
                getAriaLabel={(index) => (index === 0 ? `${label} min` : `${label} max`)}
                sx={{
                    color: 'var(--admin-control-selected, var(--m3-primary, #a5000a))',
                    '& .MuiSlider-rail': {
                        backgroundColor: 'var(--input-border-color, var(--m3-outline, #747878))',
                    },
                    '& .MuiSlider-valueLabel': {
                        backgroundColor: 'var(--admin-control-selected, var(--m3-primary, #a5000a))',
                        fontFamily: 'var(--m3-body-font-family)',
                    },
                    '& .MuiSlider-markLabel': {
                        color: 'var(--admin-form-muted-text)',
                        fontFamily: 'var(--m3-body-font-family)',
                    },
                }}
            />
            {helperText ? <FormHelperText>{helperText}</FormHelperText> : null}
        </FormControl>
    );
};

export interface MuiSliderFieldProps {
    name: FieldName;
    /** i18n key for the visible label. */
    label: string;
    /** i18n key for static helper text below the slider. */
    help?: string;
    min: number;
    max: number;
    disabled?: boolean;
    className?: string;
}

/**
 * antd `Form.Item` (noStyle) wrapping a Material UI range `Slider`.
 * Drop-in replacement for the antd-based `SliderFormField`.
 */
export const MuiSliderField = ({ name, label, help, min, max, disabled, className }: MuiSliderFieldProps) => {
    const [t] = useTranslation();

    return (
        <div className={classNames(styles.root, className)}>
            <Form.Item name={name as any} noStyle>
                <MuiSliderControl
                    fieldName={name}
                    label={t(label)}
                    helpText={help ? t(help) : undefined}
                    min={min}
                    max={max}
                    disabled={disabled}
                />
            </Form.Item>
        </div>
    );
};

export default MuiSliderField;
