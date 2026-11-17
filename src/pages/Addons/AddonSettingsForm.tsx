import { Button, Form, Input, InputNumber, Switch } from 'antd';
import type { Rule } from 'antd/es/form';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { M3Select } from '../../components/M3Select';
import type { AddonSettingsValues, JsonSchema } from '../../addons/addonTypes';
import {
    collectSettingsValues,
    explicitSettingNames,
    initialSettingsValues,
    settingsFields,
    type SettingsField,
} from './settingsSchema';
import styles from './addons.module.scss';

interface AddonSettingsFormProps {
    formId: string;
    schema: JsonSchema | null;
    values: AddonSettingsValues;
    /**
     * Effective values one level up (the Träger's, with schema defaults). When given, only fields set here
     * are saved; the others are shown with the inherited value and stay inherited.
     */
    inherited?: AddonSettingsValues;
    saving?: boolean;
    onSubmit: (values: AddonSettingsValues) => void;
}

const useFieldRules = () => {
    const { t } = useTranslation();
    return (field: SettingsField, inheriting: boolean): Rule[] => {
        const rules: Rule[] = [];
        if (field.required && field.kind !== 'switch' && !inheriting) {
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

/** A settings form generated from the add-on's JSON Schema (ADR-034, section 5). */
export const AddonSettingsForm = ({ formId, schema, values, inherited, saving, onSubmit }: AddonSettingsFormProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const rulesFor = useFieldRules();
    const fields = useMemo(() => settingsFields(schema), [schema]);
    const storedExplicit = useMemo(() => explicitSettingNames(fields, values), [fields, values]);
    const [explicit, setExplicit] = useState<Set<string>>(storedExplicit);
    const initialValues = useMemo(
        () =>
            inherited
                ? Object.fromEntries(
                      fields.map((field) => [
                          field.name,
                          storedExplicit.has(field.name) ? values[field.name] : inherited[field.name],
                      ]),
                  )
                : initialSettingsValues(fields, values),
        [fields, values, inherited, storedExplicit],
    );

    useEffect(() => {
        setExplicit(storedExplicit);
        form.setFieldsValue(initialValues);
    }, [form, initialValues, storedExplicit]);

    if (fields.length === 0) {
        return <p>{t('addons.settings.none')}</p>;
    }

    const revertToInherited = (name: string) => {
        setExplicit((current) => {
            const next = new Set(current);
            next.delete(name);
            return next;
        });
        form.setFieldValue(name, inherited?.[name]);
    };

    const extraFor = (field: SettingsField) => {
        if (!inherited) {
            return field.description;
        }
        return (
            <span className={styles.fieldExtra}>
                {field.description && <span>{field.description}</span>}
                {explicit.has(field.name) ? (
                    <Button
                        type="link"
                        size="small"
                        className={styles.inlineLink}
                        onClick={() => revertToInherited(field.name)}
                    >
                        {t('addons.settings.useInherited')}
                    </Button>
                ) : (
                    <span>{t('addons.settings.inherited')}</span>
                )}
            </span>
        );
    };

    const submit = (formValues: AddonSettingsValues) => {
        const saved = inherited ? fields.filter((field) => explicit.has(field.name)) : fields;
        onSubmit(collectSettingsValues(saved, formValues));
    };

    return (
        <Form
            form={form}
            layout="vertical"
            name={formId}
            initialValues={initialValues}
            onValuesChange={(changed: AddonSettingsValues) =>
                setExplicit((current) => new Set([...current, ...Object.keys(changed)]))
            }
            onFinish={submit}
        >
            {fields.map((field) => {
                const id = `${formId}-${field.name}`;
                return (
                    <Form.Item
                        key={field.name}
                        name={field.name}
                        htmlFor={id}
                        label={field.label}
                        extra={extraFor(field)}
                        required={!inherited && field.required}
                        rules={rulesFor(field, !!inherited)}
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
