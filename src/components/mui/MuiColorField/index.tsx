import { useContext } from 'react';
import { Form } from 'antd';
import type { Rule } from 'antd/lib/form';
import DisabledContext from 'antd/es/config-provider/DisabledContext';
import FormHelperText from '@mui/material/FormHelperText';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import ColorSelector from '../../ColorSelector/ColorSelector';
import styles from './styles.module.scss';

type FieldName = string | Array<string | number>;

interface MuiColorControlProps {
    /** Injected by antd `Form.Item`. */
    value?: string;
    onChange?: (value: string) => void;
    fieldName: FieldName;
    label: string;
    helpText?: string;
    disabled?: boolean;
}

const MuiColorControl = ({ value, onChange, fieldName, label, helpText, disabled }: MuiColorControlProps) => {
    const contextDisabled = useContext(DisabledContext);
    const isDisabled = contextDisabled || disabled;
    const { status } = Form.Item.useStatus();
    const form = Form.useFormInstance();
    const isError = status === 'error';
    const errors = form?.getFieldError(fieldName as any) ?? [];
    const helperText = (isError && errors[0]) || helpText || undefined;

    return (
        <>
            <ColorSelector
                isLoading={isDisabled}
                label={label}
                tenantColor={value}
                setColorValue={(_field, color: string) => onChange?.(color)}
                field="primaryColor"
            />
            {helperText ? <FormHelperText error={isError}>{helperText}</FormHelperText> : null}
        </>
    );
};

export interface MuiColorFieldProps {
    name?: FieldName;
    /** i18n key for the visible label. */
    labelKey?: string;
    /** i18n key for static helper text below the field. */
    help?: string;
    required?: boolean;
    disabled?: boolean;
    rules?: Rule[];
    className?: string;
}

/**
 * antd `Form.Item` (noStyle) wrapping the `react-colorful` hex picker, with the
 * MUI helper-text/error treatment the rest of the `mui/` fields use.
 *
 * Drop-in replacement for the antd-based `FormColorSelectorField` — this closes
 * the "email theme colour picker" item deferred in #340. The picker itself
 * stays `react-colorful`: MUI ships no colour picker, and swapping the widget
 * would change the visual, not just the framework.
 */
export const MuiColorField = ({
    name,
    labelKey,
    help,
    required,
    disabled,
    rules = [],
    className,
}: MuiColorFieldProps) => {
    const { t } = useTranslation();

    return (
        <div className={classNames(styles.root, className)}>
            <Form.Item
                name={name as any}
                rules={[...rules, ...(required ? [{ required: true, message: t('form.errors.required') }] : [])]}
                noStyle
            >
                <MuiColorControl
                    fieldName={name}
                    label={t(labelKey)}
                    helpText={help ? t(help) : undefined}
                    disabled={disabled}
                />
            </Form.Item>
        </div>
    );
};

export default MuiColorField;
