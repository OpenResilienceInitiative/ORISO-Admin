import { ensureHeadingAnchorIds } from '../../../FormPluginEditor/headingAnchors';

type LanguageMap = Record<string, string> | undefined;

const sameLanguageMap = (a: LanguageMap, b: LanguageMap, normalise: (value: string) => string) => {
    const languagesInEither = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
    return [...languagesInEither].every(
        (language) => normalise(a?.[language] ?? '') === normalise(b?.[language] ?? ''),
    );
};

const unchanged = (value: string) => value;

/**
 * Whether what the editor shows still IS the saved draft.
 *
 * The editor's heading-anchor extension adds an id to every heading that arrives
 * without one, and depending on timing that addition is reported as an edit. A raw
 * string comparison then calls an untouched draft "unsaved" — which happened with a
 * draft whose HTML did not come from this editor, the normal case for an adopted
 * template. Both sides therefore get the same generated ids before comparing. Ids that
 * already exist are never touched, so a real change — including a renamed anchor —
 * still counts.
 *
 * The consent sentence is plain text and is compared as it is.
 */
export const isSameDraftContent = (
    current: { content: LanguageMap; consent?: LanguageMap },
    saved: { content: LanguageMap; consent?: LanguageMap },
    { compareConsent }: { compareConsent: boolean },
): boolean =>
    sameLanguageMap(current.content, saved.content, ensureHeadingAnchorIds) &&
    (!compareConsent || sameLanguageMap(current.consent, saved.consent, unchanged));
