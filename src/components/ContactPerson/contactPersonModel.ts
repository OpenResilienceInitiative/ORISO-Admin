import type { ContactAdmin, ContactAdminType } from '../../types/contactPerson';

/**
 * Pure helpers for the contact-person pickers (ORISO-Admin#1534). Shared by the
 * Beratungsstelle tile, the Träger default tile and the user panel.
 */

export const adminName = (admin: Pick<ContactAdmin, 'firstName' | 'lastName'>) =>
    [admin.firstName, admin.lastName]
        .map((part) => (part ?? '').trim())
        .filter(Boolean)
        .join(' ');

/** The address counsellors see: the optional contact e-mail, else the login e-mail. */
export const displayEmailOf = (admin: Pick<ContactAdmin, 'contactEmail' | 'loginEmail'>) =>
    admin.contactEmail?.trim() || admin.loginEmail?.trim() || '';

const TYPE_KEYS: Record<ContactAdminType, string> = {
    AGENCY: 'contactPerson.type.agency',
    TENANT: 'contactPerson.type.tenant',
    SUPER: 'contactPerson.type.super',
};

export const typeLabelKey = (type: ContactAdminType) => TYPE_KEYS[type] ?? TYPE_KEYS.AGENCY;

/**
 * "Maria Muster (Träger-Admin) · maria@…" — one line per candidate. Name and type come
 * first, so a narrow field cuts the address rather than who it is.
 */
export const candidateLabel = (admin: ContactAdmin, translate: (key: string) => string) => {
    const email = displayEmailOf(admin);
    const name = adminName(admin) || email;
    return `${name} (${translate(typeLabelKey(admin.type))})${email && email !== name ? ` · ${email}` : ''}`;
};

/**
 * Picker options. The current contact and deputy are kept even when they dropped out
 * of the candidates (e.g. the admin left the centre), so the stored value stays visible.
 */
export const candidateOptions = (
    candidates: ContactAdmin[],
    translate: (key: string) => string,
    { keep = [], exclude }: { keep?: Array<ContactAdmin | null | undefined>; exclude?: string | null } = {},
) => {
    const byId = new Map<string, ContactAdmin>();
    [...candidates, ...keep].forEach((admin) => {
        if (admin?.adminId && !byId.has(admin.adminId)) byId.set(admin.adminId, admin);
    });
    return [...byId.values()]
        .filter((admin) => admin.adminId !== exclude)
        .map((admin) => ({ value: admin.adminId, label: candidateLabel(admin, translate) }));
};

export type ContactPairError = 'contactPerson.error.deputyWithoutContact' | 'contactPerson.error.deputySameAsContact';

/** Deputy requires a contact; deputy and contact are different people. */
export const validateContactPair = ({
    contactAdminId,
    deputyAdminId,
}: {
    contactAdminId?: string | null;
    deputyAdminId?: string | null;
}): ContactPairError | null => {
    if (!deputyAdminId) return null;
    if (!contactAdminId) return 'contactPerson.error.deputyWithoutContact';
    return deputyAdminId === contactAdminId ? 'contactPerson.error.deputySameAsContact' : null;
};

/** "Maria Muster (maria@…)" for hints and read-only lines. */
export const personLine = (admin?: ContactAdmin | null) => {
    if (!admin) return '';
    const email = displayEmailOf(admin);
    const name = adminName(admin);
    if (!name) return email;
    return email ? `${name} (${email})` : name;
};
