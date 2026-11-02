/** Same keys and bounds as `chatComposerDisabledFormats` etc. in ORISO-ConsultingTypeService. */
export const CHAT_COMPOSER_FORMAT_GROUPS = [
    { group: 'block', formats: ['heading', 'blockquote', 'codeBlock'] },
    { group: 'list', formats: ['bulletList', 'orderedList', 'taskList'] },
    {
        group: 'text',
        formats: ['bold', 'italic', 'underline', 'strike', 'code', 'highlight', 'superscript', 'subscript'],
    },
    { group: 'insert', formats: ['link', 'image', 'dateTime'] },
] as const;

export type ChatComposerFormat = (typeof CHAT_COMPOSER_FORMAT_GROUPS)[number]['formats'][number];

export const CHAT_COMPOSER_FORMATS: readonly ChatComposerFormat[] = CHAT_COMPOSER_FORMAT_GROUPS.flatMap(
    ({ formats }) => formats,
);

export const CHAT_MAX_WIDTH_LIMITS = { min: 320, max: 1600, default: 770 } as const;
export const CHAT_COLLAPSE_THRESHOLD_LIMITS = { min: 50, max: 100000, default: 300 } as const;

export interface ChatMessageSettingsValues {
    disabledFormats: ChatComposerFormat[];
    maxWidth: number;
    /** 0 = never collapse. */
    collapseThreshold: number;
}

const toInteger = (value: string | number | undefined, fallback: number): number => {
    const parsed = Number(value);
    return value === undefined || value === '' || !Number.isInteger(parsed) ? fallback : parsed;
};

/**
 * The server answers strings; right after a save `settings` briefly holds the array and numbers
 * that were sent, until the refetch lands. A backend without the fields means today's behaviour.
 */
export const parseChatMessageSettings = ({
    disabledFormats,
    maxWidth,
    collapseThreshold,
}: {
    disabledFormats?: string | string[];
    maxWidth?: string | number;
    collapseThreshold?: string | number;
}): ChatMessageSettingsValues => {
    const disabledKeys: string[] = Array.isArray(disabledFormats)
        ? disabledFormats
        : (disabledFormats ?? '').split(',').map((key) => key.trim());
    return {
        disabledFormats: CHAT_COMPOSER_FORMATS.filter((format) => disabledKeys.includes(format)),
        maxWidth: toInteger(maxWidth, CHAT_MAX_WIDTH_LIMITS.default),
        collapseThreshold: toInteger(collapseThreshold, CHAT_COLLAPSE_THRESHOLD_LIMITS.default),
    };
};
