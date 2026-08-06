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

export type ChatTypeCardDef = {
    key: ChatTypeCardKey;
    titleKey: string;
    descriptionKey: string;
    Icon: import('react').FunctionComponent<import('react').SVGProps<SVGSVGElement>>;
    masterField?: string[];
    toggles: Array<{
        labelKey: string;
        field: string[];
    }>;
};
