/**
 * Platform settings for temporary accounts from counsellor direct links (ADR-029 §3–§5).
 * Contract: ORISO-UserService#1476, `GET/PUT /service/users/admin/temporary-account-settings`.
 * Values apply to people who join after saving; existing accounts keep their copy.
 */
export const MESSAGE_RETENTION_MODES = ['ALWAYS_TEMPORARY', 'GUEST_DECIDES', 'ALWAYS_PERSISTENT'] as const;
export type MessageRetentionMode = (typeof MESSAGE_RETENTION_MODES)[number];

export interface TemporaryAccountSettings {
    /** Delete a call account N minutes after hang-up (1–1440, default 15). */
    callDeleteAfterMinutes: number;
    /** Delete a call account at the latest after N hours (1–24, default 24, hard cap). */
    callMaxLifetimeHours: number;
    /** Delete a chat account after N days without activity (1–365, default 30). */
    chatInactivityDays: number;
    /** Hide the password field; the account still gets a password (default false). */
    hidePasswordField: boolean;
    /** What happens to the guest's messages (default GUEST_DECIDES). */
    messageRetention: MessageRetentionMode;
    revision: number;
}

export const TEMPORARY_ACCOUNT_LIMITS = {
    callDeleteAfterMinutes: { min: 1, max: 1440 },
    callMaxLifetimeHours: { min: 1, max: 24 },
    chatInactivityDays: { min: 1, max: 365 },
} as const;
