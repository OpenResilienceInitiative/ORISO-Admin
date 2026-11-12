import type { AddonSettingsValues, JsonSchema } from '../../addons/addonTypes';

export type SettingsFieldKind = 'text' | 'textarea' | 'select' | 'switch' | 'integer' | 'number';

export interface SettingsField {
    name: string;
    kind: SettingsFieldKind;
    label: string;
    description?: string;
    required: boolean;
    defaultValue?: unknown;
    options?: Array<{ label: string; value: string | number | boolean }>;
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
}

const TEXTAREA_THRESHOLD = 200;

const primaryType = (schema: JsonSchema): string | undefined => {
    if (Array.isArray(schema.type)) {
        return schema.type.find((type) => type !== 'null');
    }
    return schema.type;
};

const fieldKind = (schema: JsonSchema): SettingsFieldKind | null => {
    const type = primaryType(schema);
    if (Array.isArray(schema.enum) && schema.enum.length > 0 && type !== 'boolean') {
        return 'select';
    }
    switch (type) {
        case 'string':
            return schema.format === 'textarea' || (schema.maxLength ?? 0) > TEXTAREA_THRESHOLD ? 'textarea' : 'text';
        case 'boolean':
            return 'switch';
        case 'integer':
            return 'integer';
        case 'number':
            return 'number';
        default:
            return null;
    }
};

/** The form fields for a settings schema. Unsupported property types are left out. */
export const settingsFields = (schema: JsonSchema | null | undefined): SettingsField[] => {
    if (!schema || primaryType(schema) !== 'object' || !schema.properties) {
        return [];
    }
    const required = new Set(schema.required ?? []);
    return Object.entries(schema.properties).flatMap(([name, property]) => {
        const kind = fieldKind(property ?? {});
        if (!kind) {
            return [];
        }
        const field: SettingsField = {
            name,
            kind,
            label: property.title || name,
            description: property.description,
            required: required.has(name),
            defaultValue: property.default,
            minimum: property.minimum,
            maximum: property.maximum,
            minLength: property.minLength,
            maxLength: property.maxLength,
            pattern: property.pattern,
        };
        if (kind === 'select') {
            field.options = (property.enum ?? [])
                .filter((value): value is string | number | boolean =>
                    ['string', 'number', 'boolean'].includes(typeof value),
                )
                .map((value) => ({ label: String(value), value }));
        }
        return [field];
    });
};

/** Stored values with schema defaults filled in, as the form's initial values. */
export const initialSettingsValues = (fields: SettingsField[], values: AddonSettingsValues): AddonSettingsValues =>
    Object.fromEntries(
        fields.map((field) => {
            const stored = values[field.name];
            if (stored !== undefined && stored !== null) {
                return [field.name, stored];
            }
            if (field.defaultValue !== undefined) {
                return [field.name, field.defaultValue];
            }
            return [field.name, field.kind === 'switch' ? false : undefined];
        }),
    );

const toNumber = (value: unknown, integer: boolean): number | undefined => {
    if (value === '' || value === null || value === undefined) {
        return undefined;
    }
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(number)) {
        return undefined;
    }
    return integer ? Math.trunc(number) : number;
};

/**
 * The values to send: only schema properties, typed as the schema says, empty optional fields left out
 * so the add-on falls back to its own default.
 */
export const collectSettingsValues = (
    fields: SettingsField[],
    formValues: AddonSettingsValues,
): AddonSettingsValues => {
    const result: AddonSettingsValues = {};
    fields.forEach((field) => {
        const raw = formValues[field.name];
        let value: unknown;
        switch (field.kind) {
            case 'switch':
                value = Boolean(raw);
                break;
            case 'integer':
            case 'number':
                value = toNumber(raw, field.kind === 'integer');
                break;
            case 'select':
                value = raw === '' || raw === null ? undefined : raw;
                break;
            default:
                value = typeof raw === 'string' && raw.trim() === '' ? undefined : raw;
        }
        if (value !== undefined) {
            result[field.name] = value;
        }
    });
    return result;
};
