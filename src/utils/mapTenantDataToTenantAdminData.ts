import { TenantAdminData } from '../types/TenantAdminData';
import { TenantData } from '../types/tenant';

type TranslatableContent = Record<string, string>;

const toTranslatableContent = (value: unknown): TranslatableContent => {
    if (value == null || value === '') {
        return {};
    }

    if (typeof value === 'string') {
        return { de: value };
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).filter(([, entry]) => typeof entry === 'string'),
        ) as TranslatableContent;
    }

    return {};
};

const readContentField = (tenantData: TenantData, field: string): unknown => {
    const nestedValue = tenantData.content?.[field as keyof TenantData['content']];
    if (nestedValue != null && nestedValue !== '') {
        return nestedValue;
    }

    return (tenantData as unknown as Record<string, unknown>)[field];
};

/**
 * Maps `/service/tenant/{id}` payloads into the shape expected by `/service/tenantadmin/{id}` writes.
 * Used when the admin read endpoint is unavailable but tenant-scoped settings still need to be updated.
 */
export const mapTenantDataToTenantAdminData = (tenantData: TenantData): TenantAdminData => {
    const content = tenantData.content ?? ({} as TenantData['content']);

    return {
        ...tenantData,
        adminEmails: (tenantData as unknown as TenantAdminData).adminEmails ?? [],
        theming: {
            associationLogo: tenantData.theming?.associationLogo,
            logo: tenantData.theming?.logo ?? '',
            favicon: tenantData.theming?.favicon ?? '',
            primaryColor: tenantData.theming?.primaryColor,
            secondaryColor: tenantData.theming?.secondaryColor ?? null,
            accent: tenantData.theming?.accent ?? null,
            signal: tenantData.theming?.signal ?? null,
        },
        content: {
            impressum: toTranslatableContent(readContentField(tenantData, 'impressum')),
            privacy: toTranslatableContent(readContentField(tenantData, 'privacy')),
            termsAndConditions: toTranslatableContent(readContentField(tenantData, 'termsAndConditions')),
            claim: toTranslatableContent(readContentField(tenantData, 'claim')),
            confirmTermsAndConditions:
                (content as { confirmTermsAndConditions?: boolean }).confirmTermsAndConditions ?? false,
            confirmPrivacy: (content as { confirmPrivacy?: boolean }).confirmPrivacy ?? false,
        },
        settings: tenantData.settings ?? {},
    };
};
