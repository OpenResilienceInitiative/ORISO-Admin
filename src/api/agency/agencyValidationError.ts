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
