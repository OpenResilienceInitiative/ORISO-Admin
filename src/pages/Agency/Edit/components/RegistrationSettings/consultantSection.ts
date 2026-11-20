import { isActiveRecord } from '../../../../../utils/deleteDate';

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

/**
 * Whether the agency may be made visible in registration. One rule for both screens.
 *
 * The rule guards switching visibility ON, not keeping it on. An agency that is already
 * visible keeps its unrelated edits — a postcode correction — unblocked whatever the
 * counsellor lookup says, and an unanswered lookup never authorises a new activation.
 */
export interface RegistrationVisibilityInput {
    /**
     * Whether the backend reports counsellors attached to this agency. `undefined` when the
     * lookup has not answered — still loading, or failed. Not the same as a reported zero.
     */
    hasAssignedConsultants: boolean | undefined;
    /** At least one counsellor is picked in the form and will be assigned on save. */
    hasSelectedConsultants: boolean;
    /** The agency is visible in registration as stored, so this save is not an activation. */
    isAlreadyVisible: boolean;
}

export const mayBeVisibleInRegistration = ({
    hasAssignedConsultants,
    hasSelectedConsultants,
    isAlreadyVisible,
}: RegistrationVisibilityInput): boolean =>
    isAlreadyVisible || hasSelectedConsultants || hasAssignedConsultants === true;

export interface AssignableConsultantsInput<T> {
    /** Whatever the counsellor search returned — a platform admin's result spans every Träger. */
    consultants: T[];
    /** Counsellors already attached to this agency; they are listed apart, not offered again. */
    assignedIds: ReadonlySet<string>;
    /** The Träger the agency belongs to, or undefined while it is not known yet. */
    tenantId: number | undefined;
    /**
     * The Träger must be chosen before anyone can be offered (a platform admin picks it in the
     * form). False on single-tenant deployments and for admins whose token carries it.
     */
    requiresTenant: boolean;
}

/**
 * Who may be assigned to an agency: active counsellors of the agency's own Träger (#953). The
 * backend refuses a cross-Träger assignment as well; this keeps the picker from offering one.
 * A Träger that is still unknown offers nobody when the admin has to choose it, so the first
 * pick is never made from a list that mixes Träger.
 */
export const assignableConsultants = <T extends { id: string | number; tenantId?: string | number | null }>({
    consultants,
    assignedIds,
    tenantId,
    requiresTenant,
}: AssignableConsultantsInput<T>): T[] => {
    if (tenantId === undefined && requiresTenant) {
        return [];
    }
    return consultants.filter(
        (consultant) =>
            isActiveRecord(consultant as { deleteDate?: string | null }) &&
            !assignedIds.has(String(consultant.id)) &&
            (tenantId === undefined || String(consultant.tenantId) === String(tenantId)),
    );
};
