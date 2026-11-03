import type { FormInstance } from 'antd';
import type { NamePath } from 'antd/es/form/interface';

interface AgencyValidationErrorBody {
    field?: unknown;
    reason?: unknown;
}

export interface AgencyFieldValidationError {
    fieldName: NamePath;
    translationKey: string;
}

const VALIDATION_ERRORS: Record<string, AgencyFieldValidationError> = {
    DATA_PROTECTION_OFFICER_IS_EMPTY: {
        fieldName: ['dataProtection', 'dataProtectionOfficerContact', 'nameAndLegalForm'],
        translationKey: 'agency.edit.settings.legal.validation.officer_required',
    },
    DATA_PROTECTION_RESPONSIBLE_IS_EMPTY: {
        fieldName: ['dataProtection', 'agencyDataProtectionResponsibleContact', 'nameAndLegalForm'],
        translationKey: 'agency.edit.settings.legal.validation.responsible_required',
    },
    DATA_PROTECTION_ALTERNATIVE_RESPONSIBLE_IS_EMPTY: {
        fieldName: ['dataProtection', 'alternativeDataProtectionRepresentativeContact', 'nameAndLegalForm'],
        translationKey: 'agency.edit.settings.legal.validation.alternative_required',
    },
};

export const parseAgencyFieldValidationError = async (error: unknown): Promise<AgencyFieldValidationError | null> => {
    if (!(error instanceof Response) || error.status !== 400) {
        return null;
    }

    try {
        const body = (await error.json()) as AgencyValidationErrorBody;
        if (body.field !== 'dataProtection' || typeof body.reason !== 'string') {
            return null;
        }

        return VALIDATION_ERRORS[body.reason] ?? null;
    } catch {
        return null;
    }
};

/**
 * Whether `fieldName` is rendered by `form`. A card form only mounts its own fields: the
 * registration card has no data protection inputs, so an error set there is invisible and the
 * failed save looks like nothing happened (ORISO-Admin#1243). antd passes a `null` meta for a
 * name that is not mounted, so the filter keeps only mounted ones.
 */
export const isFieldMounted = (form: Pick<FormInstance, 'getFieldsValue'>, fieldName: NamePath): boolean => {
    const path = Array.isArray(fieldName) ? fieldName : [fieldName];
    let node: unknown = form.getFieldsValue([path], (meta) => meta !== null);
    return path.every((key) => {
        if (node === null || typeof node !== 'object' || !(key in node)) {
            return false;
        }
        node = (node as Record<string | number, unknown>)[key];
        return true;
    });
};
