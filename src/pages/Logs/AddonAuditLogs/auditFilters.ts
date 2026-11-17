// Not browser-measured yet (docs/responsive-tables.md): estimates for eight and six columns.
export const AUDIT_LIST_BANDS = { phoneBelow: 700, wideFrom: 1280 };

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
