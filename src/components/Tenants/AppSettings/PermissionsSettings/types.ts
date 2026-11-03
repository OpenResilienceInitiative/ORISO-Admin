import type { ReactNode } from 'react';

export type ToggleAfterChangeHandler = (
    fieldPath: string | string[],
    value: boolean,
    currentFormData?: { settings?: Record<string, unknown> },
) => void;

/** Fired when an upper role (de)selects a feature's "enforce active state" checkbox. */
export type EnforceChangeHandler = (fieldKey: string, enforced: boolean) => void;

export type ChatTypeCardKey = 'oneOnOne' | 'liveChat' | 'group' | 'groupInternal';

export type PermissionsSettingsCommonArgs = {
    tenantId: string;
    /** Hide chat-type cards by key (e.g. liveChat on super-admin settings — managed under Global Configs). */
    excludeCardKeys?: Array<ChatTypeCardKey>;
    /** The links that open a live chat; shown on the live-chat tile (ORISO-Admin#1321). */
    liveChatLinks?: ReactNode;
};

/**
 * Capabilities a toggle can depend on, which the platform may or may not
 * actually provide in a given environment.
 *
 * `mediaAiScan`: the AI media check needs a deployed content scanner *and* a
 * signed zero-retention sub-processor agreement (ADR-019, ORISO-Admin#734).
 */
export type PermissionToggleCapability = 'mediaAiScan';

/** Notification channel switch on a conversation-type tile (FE#1725 story 38). */
export type ChatTypeNotificationToggle = {
    labelKey: string;
    /** Key inside `settings`, e.g. `featureAskerEmailLiveChatEnabled`. */
    setting: string;
    /** Label naming the type, used when the tile is hidden and the advice-seeker card shows it. */
    fallbackLabelKey?: string;
    /** Value when the backend sends none (mirrors TenantService `default`). */
    defaultValue?: boolean;
    /** Stored but without effect yet: shown disabled with a note (open product question). */
    notYetEffective?: boolean;
    /** Only meaningful while the account-level "E-Mail-Adresse darf hinterlassen werden" is on. */
    requiresAskerEmail?: boolean;
    /** The chat only asks while this delivery setting is on (emailCollectionSetupPolicy). */
    worksWithDelivery?: string;
};

export type ChatTypeCardDef = {
    key: ChatTypeCardKey;
    titleKey: string;
    Icon: import('react').FunctionComponent<import('react').SVGProps<SVGSVGElement>>;
    masterField?: string[];
    toggles: Array<{
        labelKey: string;
        field: string[];
        /**
         * Feature this toggle needs before it can do anything (ORISO-Admin#734).
         * A toggle whose capability is not available in this environment renders
         * disabled with a reason instead of pretending to control something.
         */
        requiresCapability?: PermissionToggleCapability;
    }>;
    /** Email/browser switches for this type; not master children, so a master-off never resets them. */
    notifications?: {
        audience: 'asker' | 'consultant';
        toggles: ChatTypeNotificationToggle[];
    };
};
