export type ToggleAfterChangeHandler = (
    fieldPath: string | string[],
    value: boolean,
    currentFormData?: { settings?: Record<string, unknown> },
) => void;

export type ChatTypeCardKey = 'oneOnOne' | 'liveChat' | 'group' | 'groupInternal';

export type PermissionsSettingsCommonArgs = {
    tenantId?: string;
    /** When set, edits agency-level feature flags using agency data only. */
    agencyId?: string;
    /** Hide chat-type cards by key (e.g. liveChat on super-admin settings — managed under Global Configs). */
    excludeCardKeys?: Array<ChatTypeCardKey>;
};

export type PermissionsSettingsMode = 'superAdmin' | 'tenant' | 'agency';

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
