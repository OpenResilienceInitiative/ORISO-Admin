/**
 * SINGLE SOURCE for the counsellor salutation options.
 *
 * The keys are persisted as-is and rendered through i18n
 * (`counselor.salutation.option.<key>`). Three surfaces offer the choice; a key added to one
 * list and not the others reads back as unknown on the surface that never learned it.
 */
export const SALUTATION_KEYS = [
    'counsellor_female',
    'counsellor_male',
    'counselling_person',
    'counsellor_gender_neutral',
    'not_specified',
] as const;

export type SalutationKey = (typeof SALUTATION_KEYS)[number];
