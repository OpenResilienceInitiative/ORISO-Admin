import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { putAgencyContactPerson } from '../../../api/contactPerson/contactPersonApi';
import type { AgencyContactPersonAdmin } from '../../../types/contactPerson';
import type { ContactPersonForCentre, ContactRole } from './index';
import { type ContactRolePlan, failedCentreNames, planContactRoleChanges } from './contactRolesModel';

interface ContactRoleSaverOptions {
    enabled: boolean;
    adminId: string | undefined;
    pairs: Record<number, AgencyContactPersonAdmin | undefined>;
    centres: ContactPersonForCentre[];
    /** A chosen role that cannot be saved; nothing was sent. */
    onPlanErrors: (errors: ContactRolePlan['errors']) => void;
    /** Names of the centres whose `PUT …/contactperson` was rejected. */
    onSaveFailed: (centreNames: string[]) => void;
}

/**
 * ORISO-Admin#1534: saves the "Ansprechperson für" roles, one `PUT …/contactperson` per changed
 * centre. A save is not finished until the stored pairs are loaded again, and `saving` stays true
 * until then. A second save during that time is refused: it would plan against the old pairs.
 * Resolves false when the admin save must not continue.
 */
export const useContactRoleSaver = ({
    enabled,
    adminId,
    pairs,
    centres,
    onPlanErrors,
    onSaveFailed,
}: ContactRoleSaverOptions) => {
    const queryClient = useQueryClient();
    const [saving, setSaving] = useState(false);
    const inFlight = useRef(false);

    const saveContactRoles = useCallback(
        async (roles: Record<string, ContactRole | undefined> | undefined): Promise<boolean> => {
            if (!enabled || !adminId) return true;
            if (inFlight.current) return false;
            const plan = planContactRoleChanges({ adminId, pairs, roles });
            if (plan.errors.length > 0) {
                onPlanErrors(plan.errors);
                return false;
            }
            if (plan.updates.length === 0) return true;
            inFlight.current = true;
            setSaving(true);
            try {
                const results = await Promise.allSettled(
                    // No tenant hint: the service resolves the centre's Träger, and a stale one is a 400.
                    plan.updates.map(({ agencyId, update }) => putAgencyContactPerson(agencyId, update)),
                );
                // A retry must plan against the pairs as stored now, not the ones from before this save.
                await queryClient.invalidateQueries({ queryKey: ['CONTACT_PERSON'] });
                const failedNames = failedCentreNames(plan.updates, results, centres);
                if (failedNames.length > 0) {
                    onSaveFailed(failedNames);
                    return false;
                }
                return true;
            } finally {
                inFlight.current = false;
                setSaving(false);
            }
        },
        [enabled, adminId, pairs, centres, onPlanErrors, onSaveFailed, queryClient],
    );

    return { saveContactRoles, saving };
};
