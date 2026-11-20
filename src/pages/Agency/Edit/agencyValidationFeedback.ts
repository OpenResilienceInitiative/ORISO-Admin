import type { TFunction } from 'i18next';

type FieldPath = Array<string | number> | string | number;

export interface ValidationErrorField {
    name: FieldPath;
    errors: string[];
}

/**
 * antd blocks `onFinish` when a required field is empty and marks that field
 * inline. On the agency form the required fields live in three cards spread
 * over a page that is taller than the viewport, so a user who submits from the
 * top sees nothing happen at all — the only marker is below the fold. The map
 * below turns the failing field paths into the labels the user actually reads,
 * so the notification can name them.
 */
export const AGENCY_FIELD_LABEL_KEYS: Record<string, string> = {
    name: 'agency.edit.general.general_information.name',
    postcode: 'agency.edit.general.address.postcode',
    city: 'agency.edit.general.address.city',
    tenantId: 'agency.edit.general.more_settings.tenant.title',
    topicIds: 'agency.edit.settings.departments',
    'demographics.genders': 'agency.gender',
    counsellingRelations: 'agency.relation',
};

const toKey = (name: FieldPath) => (Array.isArray(name) ? name.join('.') : String(name));

/**
 * Localized, comma separated list of the fields that failed validation.
 * Unknown paths are dropped rather than shown raw — a field key in the UI is
 * noise for the person reading the message.
 */
export const describeAgencyValidationErrors = (errorFields: ValidationErrorField[] | undefined, t: TFunction): string =>
    [
        ...new Set(
            (errorFields || [])
                .filter((field) => field?.errors?.length > 0)
                .map((field) => AGENCY_FIELD_LABEL_KEYS[toKey(field.name)])
                .filter(Boolean)
                .map((labelKey) => t(labelKey)),
        ),
    ].join(', ');
