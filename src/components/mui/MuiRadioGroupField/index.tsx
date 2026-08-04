import * as React from 'react';
import { useContext } from 'react';
import { Form } from 'antd';
import type { Rule } from 'antd/lib/form';
import DisabledContext from 'antd/es/config-provider/DisabledContext';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { flattenChildren } from '../flattenChildren';
import styles from './styles.module.scss';

type FieldName = string | Array<string | number>;

export interface MuiRadioProps {
    /**
     * Option value. Booleans are supported (the postcode-range toggle stores
     * `true`/`false`) — see the encode/decode note on {@link MuiRadioGroupField}.
     */
    value: string | number | boolean;
    children?: React.ReactNode;
    disabled?: boolean;
}

/**
 * Declarative option, kept for API parity with `FormRadioGroupField.Radio`
 * (which was antd's `Radio`). Never renders on its own — the parent reads its
 * props — so returning `null` is intentional.
 */
export const MuiRadio: React.FC<MuiRadioProps> = () => null;
MuiRadio.displayName = 'MuiRadioGroupField.Radio';

/**
 * The DOM only carries strings, so non-string option values are round-tripped
 * through a stable key and restored on change. antd's `Radio.Group` did this
 * internally; MUI's does not.
 */
const encode = (value: unknown) => (value === undefined || value === null ? '' : String(value));

interface MuiRadioControlProps {
    /** Injected by antd `Form.Item`. */
    value?: unknown;
    onChange?: (value: unknown) => void;
    fieldName: FieldName;
    label?: string;
    helpText?: string;
    disabled?: boolean;
    vertical?: boolean;
    options: MuiRadioProps[];
}

const MuiRadioControl = ({
    value,
    onChange,
    fieldName,
    label,
    helpText,
    disabled,
    vertical,
    options,
}: MuiRadioControlProps) => {
    const contextDisabled = useContext(DisabledContext);
    const isDisabled = contextDisabled || disabled;
    const { status } = Form.Item.useStatus();
    const form = Form.useFormInstance();
    const isError = status === 'error';
    const errors = form?.getFieldError(fieldName as any) ?? [];
    const helperText = (isError && errors[0]) || helpText || undefined;

    const handleChange = (_event: React.ChangeEvent<HTMLInputElement>, next: string) => {
        const match = options.find((option) => encode(option.value) === next);
        onChange?.(match ? match.value : next);
    };

    return (
        <FormControl
            className={classNames(styles.root, { [styles.disabled]: isDisabled })}
            disabled={isDisabled}
            error={isError}
            component="fieldset"
            variant="standard"
        >
            {label && <FormLabel className={styles.label}>{label}</FormLabel>}
            <RadioGroup className={styles.group} row={!vertical} value={encode(value)} onChange={handleChange}>
                {options.map((option) => (
                    <FormControlLabel
                        key={encode(option.value)}
                        className={styles.option}
                        value={encode(option.value)}
                        label={option.children}
                        disabled={isDisabled || option.disabled}
                        control={<Radio size="small" />}
                    />
                ))}
            </RadioGroup>
            {helperText ? <FormHelperText>{helperText}</FormHelperText> : null}
        </FormControl>
    );
};

export interface MuiRadioGroupFieldProps {
    name?: FieldName;
    /** i18n key for the group label. */
    labelKey?: string;
    /** i18n key for static helper text below the group. */
    help?: string;
    required?: boolean;
    disabled?: boolean;
    rules?: Rule[];
    dependencies?: string[];
    /** Stacks the options instead of laying them out in a row. */
    vertical?: boolean;
    className?: string;
    children?: React.ReactNode;
}

/**
 * antd `Form.Item` (noStyle) wrapping a Material UI `RadioGroup`.
 * Drop-in replacement for the antd-based `FormRadioGroupField`, including the
 * `.Radio` child API.
 */
export const MuiRadioGroupField = ({
    name,
    labelKey,
    help,
    required,
    disabled,
    rules,
    dependencies,
    vertical,
    className,
    children,
}: MuiRadioGroupFieldProps) => {
    const { t } = useTranslation();

    const options = React.useMemo(
        () => flattenChildren(children).map((child) => (child as React.ReactElement<MuiRadioProps>).props),
        [children],
    );

    return (
        <div className={className}>
            <Form.Item
                name={name as any}
                rules={[
                    ...(required ? [{ required: true, message: t('form.errors.required') }] : []),
                    ...(rules || []),
                ]}
                dependencies={dependencies}
                noStyle
            >
                <MuiRadioControl
                    fieldName={name}
                    label={labelKey ? t(labelKey) : undefined}
                    helpText={help ? t(help) : undefined}
                    disabled={disabled}
                    vertical={vertical}
                    options={options}
                />
            </Form.Item>
        </div>
    );
};

MuiRadioGroupField.Radio = MuiRadio;

export default MuiRadioGroupField;
