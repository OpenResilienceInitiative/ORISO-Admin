import { Button, Form, Input, InputNumber, Switch } from 'antd';
import type { Rule } from 'antd/es/form';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { M3Select } from '../../components/M3Select';
import type { AddonSettingsValues, JsonSchema } from '../../addons/addonTypes';
import { collectSettingsValues, initialSettingsValues, settingsFields, type SettingsField } from './settingsSchema';

interface AddonSettingsFormProps {
    formId: string;
    schema: JsonSchema | null;
    values: AddonSettingsValues;
    saving?: boolean;
    onSubmit: (values: AddonSettingsValues) => void;
}

const useFieldRules = () => {
    const { t } = useTranslation();
    return (field: SettingsField): Rule[] => {
        const rules: Rule[] = [];
        if (field.required && field.kind !== 'switch') {
            rules.push({ required: true, message: String(t('addons.validation.required')) });
        }
        if ((field.kind === 'integer' || field.kind === 'number') && field.minimum !== undefined) {
            rules.push({
                type: 'number',
                min: field.minimum,
                message: String(t('addons.validation.minimum', { min: field.minimum })),
            });
        }
        if ((field.kind === 'integer' || field.kind === 'number') && field.maximum !== undefined) {
            rules.push({
                type: 'number',
                max: field.maximum,
                message: String(t('addons.validation.maximum', { max: field.maximum })),
            });
        }
        if ((field.kind === 'text' || field.kind === 'textarea') && field.minLength !== undefined) {
            rules.push({
                min: field.minLength,
                message: String(t('addons.validation.minLength', { min: field.minLength })),
            });
        }
        if ((field.kind === 'text' || field.kind === 'textarea') && field.maxLength !== undefined) {
            rules.push({
                max: field.maxLength,
                message: String(t('addons.validation.maxLength', { max: field.maxLength })),
            });
        }
        if ((field.kind === 'text' || field.kind === 'textarea') && field.pattern) {
            try {
                rules.push({ pattern: new RegExp(field.pattern), message: String(t('addons.validation.pattern')) });
            } catch {
                // An invalid pattern in the add-on's schema is left to the server-side check.
            }
        }
        return rules;
    };
};

const renderControl = (field: SettingsField, id: string) => {
    switch (field.kind) {
        case 'switch':
            return <Switch id={id} />;
        case 'integer':
            return <InputNumber id={id} min={field.minimum} max={field.maximum} precision={0} />;
        case 'number':
            return <InputNumber id={id} min={field.minimum} max={field.maximum} />;
        case 'select':
            return <M3Select id={id} allowClear={!field.required} options={field.options} />;
        case 'textarea':
            return <Input.TextArea id={id} rows={4} maxLength={field.maxLength} showCount={!!field.maxLength} />;
        default:
            return <Input id={id} maxLength={field.maxLength} />;
    }
};

/** A settings form generated from the add-on's JSON Schema (ADR-032, section 5). */
export const AddonSettingsForm = ({ formId, schema, values, saving, onSubmit }: AddonSettingsFormProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const rulesFor = useFieldRules();
    const fields = useMemo(() => settingsFields(schema), [schema]);
    const initialValues = useMemo(() => initialSettingsValues(fields, values), [fields, values]);

    useEffect(() => {
        form.setFieldsValue(initialValues);
    }, [form, initialValues]);

    if (fields.length === 0) {
        return <p>{t('addons.settings.none')}</p>;
    }

    return (
        <Form
            form={form}
            layout="vertical"
            name={formId}
            initialValues={initialValues}
            onFinish={(formValues) => onSubmit(collectSettingsValues(fields, formValues))}
        >
            {fields.map((field) => {
                const id = `${formId}-${field.name}`;
                return (
                    <Form.Item
                        key={field.name}
                        name={field.name}
                        htmlFor={id}
                        label={field.label}
                        extra={field.description}
                        required={field.required}
                        rules={rulesFor(field)}
                        valuePropName={field.kind === 'switch' ? 'checked' : 'value'}
                    >
                        {renderControl(field, id)}
                    </Form.Item>
                );
            })}
            <Button type="primary" htmlType="submit" loading={saving}>
                {t('addons.settings.save')}
            </Button>
        </Form>
    );
};

export default AddonSettingsForm;
