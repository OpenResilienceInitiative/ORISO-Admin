import type { CalendarPolicies, PermissionPolicyMode, PolicyValue } from '../../../../../types/permissionPolicy';

/** What the backend answers while nothing is set anywhere (ORISO-TenantService#365): off, a recommendation. */
export const DEFAULT_SHOW_ASKER_USERNAMES_POLICY: PolicyValue<boolean> = {
    value: false,
    mode: 'SUGGESTED',
    inherited: true,
};

const MODES: readonly PermissionPolicyMode[] = ['SUGGESTED', 'ENFORCED'];

/** The two calendar policies; each one is saved on its own. */
export type CalendarPolicyKey = keyof Required<CalendarPolicies>;

/** One change from a calendar control: value and mode only, `inherited` is read-only. */
export type CalendarPolicyChange = {
    [Key in CalendarPolicyKey]?: Pick<NonNullable<CalendarPolicies[Key]>, 'value' | 'mode'>;
};

const CALENDAR_POLICY_KEYS: readonly CalendarPolicyKey[] = ['visibilityScope', 'showAskerUsernames'];

/**
 * Reads the username switch tolerantly: a value that is not a boolean is the default, a missing mode
 * a recommendation.
 */
export const resolveShowAskerUsernamesPolicy = (raw?: Partial<PolicyValue<boolean>> | null): PolicyValue<boolean> => {
    if (typeof raw?.value !== 'boolean') {
        return DEFAULT_SHOW_ASKER_USERNAMES_POLICY;
    }
    return {
        value: raw.value,
        mode: raw.mode && MODES.includes(raw.mode) ? raw.mode : 'SUGGESTED',
        inherited: raw.inherited === true,
    };
};

/** Same rule as the other permission tiles: a requirement set above is read-only below. */
export const isCalendarPolicyLocked = (
    policy: Pick<PolicyValue<unknown>, 'mode' | 'inherited'>,
    level: 'platform' | 'tenant' | 'agency',
) => level !== 'platform' && policy.mode === 'ENFORCED' && policy.inherited === true;

/**
 * The request-body part for saving one calendar policy. The backend replaces the whole `calendar`
 * block (an omitted policy falls back to the platform, or to the default on the platform), so the
 * other policy is echoed when this level set it itself, and left out when it is inherited: echoing
 * an inherited value would turn it into an override that no longer follows the platform.
 */
export const toCalendarWrite = (
    current: CalendarPolicies | null | undefined,
    change: CalendarPolicyChange,
): { calendar: CalendarPolicies } => {
    const calendar: Record<string, Pick<PolicyValue<unknown>, 'value' | 'mode'>> = {};
    CALENDAR_POLICY_KEYS.forEach((key) => {
        const changed = change[key];
        const stored = current?.[key];
        if (changed) {
            calendar[key] = { value: changed.value, mode: changed.mode };
        } else if (stored && stored.inherited !== true) {
            calendar[key] = { value: stored.value, mode: stored.mode };
        }
    });
    return { calendar: calendar as CalendarPolicies };
};

/**
 * Body for saving something else (a switch, the group-chat scope): the calendar is left out, and
 * the backend keeps whatever is stored. It is never echoed, so no other save can clear or override it.
 */
export const withoutCalendar = <T extends { calendar?: CalendarPolicies }>(body: T): Omit<T, 'calendar'> => {
    const rest = { ...body };
    delete rest.calendar;
    return rest;
};
