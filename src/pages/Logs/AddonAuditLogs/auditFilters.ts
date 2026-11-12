// Not browser-measured yet (docs/responsive-tables.md): estimates for seven and five columns.
export const AUDIT_LIST_BANDS = { phoneBelow: 700, wideFrom: 1280 };

const NOISE_ROLES = new Set(['offline_access', 'uma_authorization']);

export const visibleRoles = (roles: string[] | null | undefined) =>
    (roles ?? []).filter((role) => !NOISE_ROLES.has(role) && !role.startsWith('default-roles'));

/** The picked day is in the admin's time zone; `to` is the last instant of that day. */
export const dayStart = (day: string) => (day ? new Date(`${day}T00:00:00`).toISOString() : undefined);
export const dayEnd = (day: string) => (day ? new Date(`${day}T23:59:59.999`).toISOString() : undefined);
