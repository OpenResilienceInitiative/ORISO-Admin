import type { ConversationType, LangMap } from '../ConversationModules/conversationModule';

/**
 * Name and icon of each conversation type (ADR-036 decision 21). The platform admin renames
 * "Mailberatung" and the others and uploads their icon as SVG; it is stored in the global
 * configuration. A type without own settings keeps the shipped name and icon.
 */

/** Outline in two weights, as Material Symbols ship them, and the filled form for "selected". */
export const ICON_VARIANTS = ['outline200', 'outline400', 'filled'] as const;
export type IconVariant = (typeof ICON_VARIANTS)[number];

export interface TypeAppearance {
    name: LangMap;
    /** SVG markup per variant. */
    icons: Partial<Record<IconVariant, string>>;
}

export type AppearanceSettings = Partial<Record<ConversationType, TypeAppearance>>;

const hasText = (value: string | undefined) => !!value && value.trim() !== '';

/** The name in `language`, else the German one, else the shipped name. */
export const nameOf = (
    settings: AppearanceSettings,
    type: ConversationType,
    language: string,
    shipped: string,
): string => {
    const name = settings[type]?.name;
    if (hasText(name?.[language])) return (name?.[language] as string).trim();
    if (hasText(name?.de)) return (name?.de as string).trim();
    return shipped;
};

const own = (settings: AppearanceSettings, type: ConversationType): TypeAppearance =>
    settings[type] ?? { name: {}, icons: {} };

export const setName = (
    settings: AppearanceSettings,
    type: ConversationType,
    language: string,
    name: string,
): AppearanceSettings => ({
    ...settings,
    [type]: { ...own(settings, type), name: { ...own(settings, type).name, [language]: name } },
});

export const setIcon = (
    settings: AppearanceSettings,
    type: ConversationType,
    variant: IconVariant,
    svg: string | undefined,
): AppearanceSettings => {
    const icons = { ...own(settings, type).icons };
    if (svg === undefined) delete icons[variant];
    else icons[variant] = svg;
    return { ...settings, [type]: { ...own(settings, type), icons } };
};

/** The asked variant, else the regular outline, which every other form can stand in for. */
export const iconFor = (
    settings: AppearanceSettings,
    type: ConversationType,
    variant: IconVariant,
): string | undefined => settings[type]?.icons[variant] ?? settings[type]?.icons.outline400;

/** An icon is shown through <img>, so nothing inside it ever runs. */
export const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** An icon is a few paths; anything near this size is a picture, not an icon. */
export const MAX_SVG_BYTES = 50_000;

export type SvgCheck = { ok: true; svg: string } | { ok: false; reason: 'notSvg' | 'tooLarge' | 'unsafe' };

const PROLOG = /^\s*(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?/i;
const UNSAFE = [
    /<script/i,
    /\son[a-z]+\s*=/i,
    /javascript:/i,
    /<foreignObject/i,
    /<(image|use|iframe|embed|object)\b[^>]*\bhref\s*=\s*["']?(?!#)/i,
];

/**
 * Checks an uploaded file before it is stored. The server checks again; this only spares the
 * editor a round trip with an obviously wrong file.
 */
export const validateSvg = (text: string): SvgCheck => {
    if (!/^<svg[\s>]/i.test(text.replace(PROLOG, ''))) return { ok: false, reason: 'notSvg' };
    if (new TextEncoder().encode(text).length > MAX_SVG_BYTES) return { ok: false, reason: 'tooLarge' };
    if (UNSAFE.some((pattern) => pattern.test(text))) return { ok: false, reason: 'unsafe' };
    return { ok: true, svg: text };
};
