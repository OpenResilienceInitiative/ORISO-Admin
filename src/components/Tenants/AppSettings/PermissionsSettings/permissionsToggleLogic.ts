import type { FormInstance } from 'antd';
import { MASTER_TOGGLE_CHILDREN } from './chatTypeCards';

export const buildTogglePayload = (
    fieldPath: string | string[],
    value: boolean,
    masterToggleChildren: Record<string, string[]> = MASTER_TOGGLE_CHILDREN,
): Record<string, unknown> => {
    const path = Array.isArray(fieldPath) ? fieldPath : [fieldPath];
    const fieldKey = path[path.length - 1] as string;

    const settings: Record<string, boolean> = { [fieldKey]: value };

    if (!value && masterToggleChildren[fieldKey]) {
        masterToggleChildren[fieldKey].forEach((childKey) => {
            settings[childKey] = false;
        });
    }

    if (path.length === 1) {
        return settings;
    }

    return path.slice(0, -1).reduceRight<unknown>((acc, key) => ({ [key]: acc }), settings) as Record<string, unknown>;
};

export const syncMasterChildTogglesInForm = (
    form: FormInstance,
    fieldPath: string | string[],
    value: boolean,
    masterToggleChildren: Record<string, string[]> = MASTER_TOGGLE_CHILDREN,
): void => {
    if (value) {
        return;
    }

    const path = Array.isArray(fieldPath) ? fieldPath : [fieldPath];
    const fieldKey = path[path.length - 1] as string;
    const children = masterToggleChildren[fieldKey];

    if (!children?.length) {
        return;
    }

    const prefix = path.slice(0, -1);
    form.setFields(children.map((childKey) => ({ name: [...prefix, childKey], value: false })));
};
