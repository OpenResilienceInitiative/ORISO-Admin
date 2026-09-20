/**
 * Who may see the consultant assignment block, and why the create button is off. Visible on a
 * saved agency without entering edit mode, so the "save the agency first" hint is reachable.
 */
export interface ConsultantSectionInput {
    /** The section renders as form fields inside an editable card (the edit page). */
    asFields?: boolean;
    /** That card is currently in edit mode. */
    editing?: boolean;
    /** The agency exists in the backend, so a counsellor can be attached to it. */
    hasPersistedAgency: boolean;
    /** A tenant is known — superadmins must pick one before anything can be created. */
    hasTenant: boolean;
}

export const isConsultantSectionVisible = ({
    asFields,
    editing,
    hasPersistedAgency,
}: ConsultantSectionInput): boolean => !asFields || Boolean(editing) || hasPersistedAgency;

/**
 * The i18n key explaining why creating a counsellor is not possible yet, or null when it is.
 * Order matters: an unsaved agency is the blocker the admin can act on first.
 */
export const consultantCreationBlockedReason = ({
    hasPersistedAgency,
    hasTenant,
}: ConsultantSectionInput): string | null => {
    if (!hasPersistedAgency) {
        return 'agency.form.registrationSettings.createConsultant.saveAgencyFirst';
    }
    if (!hasTenant) {
        return 'agency.form.registrationSettings.createConsultant.tenantFirst';
    }
    return null;
};
