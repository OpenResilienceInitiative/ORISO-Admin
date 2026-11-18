// Measured in AddonAuditLogs.stories.tsx (docs/responsive-tables.md): eight columns need 1030px, six need 724px.
export const AUDIT_LIST_BANDS = { phoneBelow: 730, wideFrom: 1040 };

const NOISE_ROLES = new Set(['offline_access', 'uma_authorization']);

export const visibleRoles = (roles: string[] | null | undefined) =>
    (roles ?? []).filter((role) => !NOISE_ROLES.has(role) && !role.startsWith('default-roles'));

/** Picked days are in the admin's time zone; `to` is exclusive, so it is the start of the following day. */
export const dayStart = (day: string) => (day ? new Date(`${day}T00:00:00`).toISOString() : undefined);
export const nextDayStart = (day: string) => {
    if (!day) return undefined;
    const next = new Date(`${day}T00:00:00`);
    next.setDate(next.getDate() + 1);
    return next.toISOString();
};
