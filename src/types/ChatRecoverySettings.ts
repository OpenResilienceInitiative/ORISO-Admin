export const CHAT_RECOVERY_MODES = ['LOGIN_PASSWORD', 'RECOVERY_KEY'] as const;
export type ChatRecoveryMode = (typeof CHAT_RECOVERY_MODES)[number];

export interface ChatRecoverySettings {
    asker: ChatRecoveryMode;
    consultant: ChatRecoveryMode;
    revision: number;
}
