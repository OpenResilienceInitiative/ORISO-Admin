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
};

/**
 * Capabilities a toggle can depend on, which the platform may or may not
 * actually provide in a given environment.
 *
 * `mediaAiScan`: the AI media check needs a deployed content scanner *and* a
 * signed zero-retention sub-processor agreement (ADR-019, ORISO-Admin#734).
 */
export type PermissionToggleCapability = 'mediaAiScan';

export type ChatTypeCardDef = {
    key: ChatTypeCardKey;
    titleKey: string;
    descriptionKey: string;
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
};
