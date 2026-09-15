import mergeWith from 'lodash.mergewith';
import { TenantAdminData } from '../types/TenantAdminData';

export const mergeTenantAdminData = (
    currentTenantData: TenantAdminData | undefined,
    formData: Partial<TenantAdminData>,
): TenantAdminData => {
    const base = currentTenantData ?? ({} as TenantAdminData);
    const tmp = {
        ...base,
        content: { ...(base.content ?? {}) },
    };

    Object.keys(tmp.content).forEach((key) => {
        if (typeof tmp.content[key] === 'boolean') {
            delete tmp.content[key];
        }
    });

    const finalData = mergeWith(tmp, formData, (objValue, srcValue) => {
        return objValue instanceof Array ? srcValue : undefined;
    }) as TenantAdminData;

    if (finalData.content) {
        Object.keys(finalData.content).forEach((key) => {
            delete finalData.content[key]?.translate;
        });
    }

    return finalData;
};

/** Normalize only the invalid read-model echo; local cache merges retain the original shape. */
export const serializeTenantAdminDataUpdate = (
    currentTenantData: TenantAdminData | undefined,
    formData: Partial<TenantAdminData>,
): string => {
    const payload = mergeTenantAdminData(currentTenantData, formData);
    if (
        !Object.prototype.hasOwnProperty.call(formData, 'licensing') &&
        payload.licensing?.allowedNumberOfUsers === null &&
        Object.keys(payload.licensing).length === 1
    ) {
        // The existing null quota stays null when licensing is omitted. Never omit a populated quota.
        delete payload.licensing;
    }
    return JSON.stringify(payload);
};
