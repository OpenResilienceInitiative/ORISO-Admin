import type { AgencyContactPersonAdmin, ContactPersonUpdate } from '../../../types/contactPerson';
import { adminName } from '../../../components/ContactPerson/contactPersonModel';
import type { ContactPersonForCentre, ContactRole } from './index';

/**
 * Section "Ansprechperson für" of the admin user edit (ORISO-Admin#1534): which
 * role this admin holds per centre, and which `PUT …/contactperson` calls a
 * changed role needs. The centre's stored pair is the base, so changing one
 * admin never drops the other person of the pair unnoticed.
 */

export const roleOf = (pair: AgencyContactPersonAdmin | undefined, adminId: string): ContactRole => {
    if (pair?.contact?.adminId === adminId) return 'CONTACT';
    if (pair?.deputy?.adminId === adminId) return 'DEPUTY';
    return 'NONE';
};

/** Rows for the centres whose stored pair is known; a centre that did not load is left out. */
export const centresForAdmin = (
    agencies: Array<{ id: number | string; name?: string | null }>,
    pairs: Record<number, AgencyContactPersonAdmin | undefined>,
    adminId: string,
): ContactPersonForCentre[] =>
    agencies.flatMap((agency) => {
        const agencyId = Number(agency.id);
        const pair = pairs[agencyId];
        if (!pair) return [];
        return [
            {
                agencyId,
                agencyName: agency.name || `#${agencyId}`,
                role: roleOf(pair, adminId),
                currentContactName: pair.contact ? adminName(pair.contact) : null,
            },
        ];
    });

export interface ContactRolePlan {
    updates: Array<{ agencyId: number; update: ContactPersonUpdate }>;
    /** Centres where the chosen role cannot be saved, with the i18n key that says why. */
    errors: Array<{ agencyId: number; errorKey: string }>;
}

/** The new pair of one centre when this admin takes `role` there. */
export const nextPair = (
    pair: AgencyContactPersonAdmin,
    adminId: string,
    role: ContactRole,
): ContactPersonUpdate | { errorKey: string } => {
    const contactId = pair.contact?.adminId ?? null;
    const deputyId = pair.deputy?.adminId ?? null;
    const others = {
        contact: contactId === adminId ? null : contactId,
        deputy: deputyId === adminId ? null : deputyId,
    };

    if (role === 'CONTACT') {
        return { contactAdminId: adminId, deputyAdminId: others.deputy };
    }
    if (role === 'DEPUTY') {
        // A deputy needs a contact, and it cannot be the deputy itself.
        if (!others.contact) return { errorKey: 'admin.contactPersonFor.deputyNeedsContact' };
        return { contactAdminId: others.contact, deputyAdminId: adminId };
    }
    // NONE: when the contact steps down, the deputy moves up rather than being dropped.
    if (contactId === adminId) {
        return { contactAdminId: others.deputy, deputyAdminId: null };
    }
    return { contactAdminId: others.contact, deputyAdminId: others.deputy };
};

/** Only rows whose role changed produce a call. */
export const planContactRoleChanges = ({
    adminId,
    pairs,
    roles,
}: {
    adminId: string;
    pairs: Record<number, AgencyContactPersonAdmin | undefined>;
    roles: Record<string, ContactRole | undefined> | undefined;
}): ContactRolePlan =>
    Object.entries(roles ?? {}).reduce<ContactRolePlan>(
        (plan, [key, role]) => {
            const agencyId = Number(key);
            const pair = pairs[agencyId];
            if (!pair || !role || role === roleOf(pair, adminId)) return plan;
            const next = nextPair(pair, adminId, role);
            if ('errorKey' in next) {
                plan.errors.push({ agencyId, errorKey: next.errorKey });
            } else {
                plan.updates.push({ agencyId, update: next });
            }
            return plan;
        },
        { updates: [], errors: [] },
    );
