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
