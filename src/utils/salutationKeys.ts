/**
 * SINGLE SOURCE for the counsellor salutation options (#994).
 *
 * The keys are persisted as-is and rendered through i18n
 * (`counselor.salutation.option.<key>`). Wording of the option list follows
 * the Counsellor Setup Wizard design: Beraterin, Berater, Beratende Person,
 * Berater*in, keine Angabe.
 *
 * Three surfaces offer the choice — the admin consultant form and the agency
 * screen's quick-create dialog (both through `ConsultantFields`), and the
 * counsellor onboarding wizard (`PersonalInfoCard`). They used to carry a copy
 * each, held together by a comment asking the next person to keep them
 * identical. A salutation added to one list and not the others would read back
 * as an unknown key on the surface that never learned about it.
 */
export const SALUTATION_KEYS = [
    'counsellor_female',
    'counsellor_male',
    'counselling_person',
    'counsellor_gender_neutral',
    'not_specified',
] as const;

export type SalutationKey = (typeof SALUTATION_KEYS)[number];
