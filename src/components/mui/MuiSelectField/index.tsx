import * as React from 'react';
import { useContext, useMemo } from 'react';
import { Form } from 'antd';
import type { Rule } from 'antd/lib/form';
import type { ValidateStatus } from 'antd/es/form/FormItem';
import DisabledContext from 'antd/es/config-provider/DisabledContext';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import { useTranslation } from 'react-i18next';
import { muiFieldSx } from '../fieldSx';
import { flattenChildren } from '../flattenChildren';

export interface Option {
    label: string;
    value: string;
}

type FieldName = string | Array<string | number>;

/** An option plus the optional rich node an `MuiSelectField.Option` child supplied. */
interface ResolvedOption extends Option {
    node?: React.ReactNode;
}

export interface MuiSelectOptionProps {
    value: string;
    /** Filter/-display text. Falls back to `children` when that is a plain string. */
    label?: string;
    className?: string;
    children?: React.ReactNode;
}

/**
 * Declarative option, kept for API parity with `SelectFormField.Option`
 * (which was `antd`'s `Select.Option`). It never renders on its own — the
 * parent reads its props — so returning `null` is intentional.
 */
export const MuiSelectOption: React.FC<MuiSelectOptionProps> = () => null;
MuiSelectOption.displayName = 'MuiSelectField.Option';

/** Turns `<MuiSelectField.Option>` children into option descriptors. */
const optionsFromChildren = (children?: React.ReactNode): ResolvedOption[] =>
    flattenChildren(children).map((child) => {
        const { value, label, children: node } = (child as React.ReactElement<MuiSelectOptionProps>).props;
        const fallbackLabel = typeof node === 'string' ? node : String(value);

        return { value: String(value), label: label ?? fallbackLabel, node };
    });

// Match the old antd behaviour: case-insensitive substring match on the label.
const filterOptions = createFilterOptions<ResolvedOption>({
    stringify: (option) => option.label ?? '',
});

interface MuiSelectControlProps {
    /** Injected by antd `Form.Item`. */
    value?: any;
    onChange?: (value: any) => void;
    onBlur?: React.FocusEventHandler;
    /**
     * Injected by `Form.Item`. It must reach the native input so
     * `form.scrollToField` / `focusFirstInvalidField` can resolve the field —
     * see the note in {@link MuiFormField}.
     */
    id?: string;
    fieldName: FieldName;
    label?: string;
    placeholder?: string;
    resolvedOptions: ResolvedOption[];
    isMulti?: boolean;
    allowClear?: boolean;
    loading?: boolean;
    labelInValue?: boolean;
    disabled?: boolean;
    required?: boolean;
    helpText?: string;
    validateStatus?: ValidateStatus;
    className?: string;
}

/**
 * Inner MUI control. Validation status comes from the surrounding `Form.Item`
 * and the message from the form instance, exactly as {@link MuiFormField} does.
 */
const MuiSelectControl = ({
    id,
    value,
    onChange,
    onBlur,
    fieldName,
    label,
    placeholder,
    resolvedOptions,
    isMulti,
    allowClear,
    loading,
    labelInValue,
    disabled,
    required,
    helpText,
    validateStatus,
    className,
}: MuiSelectControlProps) => {
    const contextDisabled = useContext(DisabledContext);
    const isDisabled = contextDisabled || disabled;
    const { status } = Form.Item.useStatus();
    const form = Form.useFormInstance();
    const isError = (validateStatus ?? status) === 'error';
    const errors = form?.getFieldError(fieldName as any) ?? [];
    // Keep height stable: always render a helper line (' ' when empty).
    const helperText = (isError && errors[0]) || helpText || ' ';

    const byValue = useMemo(() => {
        const index = new Map<string, ResolvedOption>();
        resolvedOptions.forEach((option) => index.set(option.value, option));
        return index;
    }, [resolvedOptions]);

    /**
     * Form value → Autocomplete value. Accepts both shapes a field can hold:
     * bare values, and `{ value, label }` objects when `labelInValue` is set
     * (or when the server echoed a labelled value back into the form).
     */
    const toOption = React.useCallback(
        (entry: any): ResolvedOption | null => {
            if (entry === undefined || entry === null || entry === '') {
                return null;
            }
            if (typeof entry === 'object') {
                const key = String(entry.value);
                return byValue.get(key) ?? { value: key, label: entry.label ?? key };
            }
            const key = String(entry);
            return byValue.get(key) ?? { value: key, label: key };
        },
        [byValue],
    );

    const selected = useMemo(() => {
        if (isMulti) {
            return (Array.isArray(value) ? value : []).map(toOption).filter(Boolean) as ResolvedOption[];
        }
        return toOption(value);
    }, [isMulti, toOption, value]);

    const emit = (option: ResolvedOption) =>
        labelInValue ? { value: option.value, label: option.label } : option.value;

    const handleChange = (_event: React.SyntheticEvent, next: ResolvedOption | ResolvedOption[] | null) => {
        if (isMulti) {
            onChange?.(((next as ResolvedOption[]) ?? []).map(emit));
            return;
        }
        onChange?.(next ? emit(next as ResolvedOption) : undefined);
    };

    return (
        <Autocomplete
            id={id}
            className={className}
            multiple={isMulti}
            disableCloseOnSelect={isMulti}
            options={resolvedOptions}
            value={selected as any}
            onChange={handleChange}
            onBlur={onBlur}
            disabled={isDisabled}
            loading={loading}
            disableClearable={!allowClear}
            filterOptions={filterOptions}
            getOptionLabel={(option) => (option as ResolvedOption).label ?? ''}
            isOptionEqualToValue={(option, selectedOption) => option.value === selectedOption?.value}
            noOptionsText={placeholder}
            sx={muiFieldSx(isDisabled)}
            renderOption={(liProps, option) => {
                // MUI puts `key` in the same object as the DOM props; React 19
                // warns when a key is spread, so pull it out explicitly.
                const { key, ...rest } = liProps;
                return (
                    <li key={key} {...rest}>
                        {option.node ?? option.label}
                    </li>
                );
            }}
            // `multiple` renders the selected values as MUI Chips by default,
            // which is the antd tag equivalent — no custom renderValue needed.
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={required && label ? `${label} *` : label}
                    placeholder={placeholder}
                    error={isError}
                    helperText={helperText}
                    slotProps={{
                        ...params.slotProps,
                        input: {
                            ...params.slotProps.input,
                            endAdornment: (
                                <>
                                    {loading ? <CircularProgress color="inherit" size={18} /> : null}
                                    {params.slotProps.input.endAdornment}
                                </>
                            ),
                        },
                    }}
                />
            )}
        />
    );
};

export interface MuiSelectFieldProps {
    name: FieldName;
    /** i18n key for the visible label. */
    label?: string;
    /** i18n key for the placeholder / empty text. */
    placeholder?: string;
    /** i18n key for static helper text below the field. */
    help?: string;
    options?: Option[];
    /** `MuiSelectField.Option` children, as an alternative to `options`. */
    children?: React.ReactNode;
    isMulti?: boolean;
    allowClear?: boolean;
    loading?: boolean;
    required?: boolean;
    disabled?: boolean;
    /** Stores `{ value, label }` instead of the bare value. */
    labelInValue?: boolean;
    /** Overrides the generated "field is required" message. */
    errorMessage?: string;
    validateStatus?: ValidateStatus;
    initialValue?: string | string[];
    rules?: Rule[];
    className?: string;
}

/**
 * antd `Form.Item` (noStyle) wrapping a Material UI `Autocomplete` — the select
 * counterpart to {@link MuiFormField}. Binding and validation stay on antd,
 * presentation is MUI, so a select and a text input render identically inside
 * the same form.
 *
 * Drop-in replacement for the antd-based `SelectFormField`: same props, same
 * `.Option` child API, and `label`/`placeholder`/`help` are still i18n keys
 * translated here (every call site passes keys).
 */
export const MuiSelectField = ({
    name,
    label,
    placeholder,
    help,
    options,
    children,
    isMulti,
    allowClear,
    loading,
    required,
    disabled,
    labelInValue,
    errorMessage,
    validateStatus,
    initialValue,
    rules = [],
    className,
}: MuiSelectFieldProps) => {
    const [t] = useTranslation();
    const requiredMessage = errorMessage || t(`form.errors.required${isMulti ? '.multiSelect' : ''}`);

    // Options may come from `options` or from `.Option` children; the old antd
    // select sorted the visible list alphabetically (`filterSort`), so keep that.
    const resolvedOptions = useMemo(() => {
        const list: ResolvedOption[] = options?.length ? options.map((o) => ({ ...o, value: String(o.value) })) : [];
        const fromChildren = optionsFromChildren(children);

        return [...list, ...fromChildren].sort((a, b) =>
            (a.label ?? '').toLowerCase().localeCompare((b.label ?? '').toLowerCase()),
        );
    }, [options, children]);

    return (
        <Form.Item
            name={name as any}
            rules={[...rules, ...(required ? [{ required: true, message: requiredMessage }] : [])]}
            initialValue={initialValue}
            noStyle
        >
            <MuiSelectControl
                fieldName={name}
                label={label ? t(label) : undefined}
                placeholder={placeholder ? t(placeholder) : undefined}
                helpText={help ? t(help) : undefined}
                resolvedOptions={resolvedOptions}
                isMulti={isMulti}
                allowClear={allowClear}
                loading={loading}
                labelInValue={labelInValue}
                disabled={disabled}
                required={required}
                validateStatus={validateStatus}
                className={className}
            />
        </Form.Item>
    );
};

MuiSelectField.Option = MuiSelectOption;

export default MuiSelectField;
