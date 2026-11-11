import type { Localized, TopicLayout } from './topicLayout';

/**
 * Pure helpers for the per-language texts of the catalogue. The source language lives in `name` /
 * `description`, every other language in `names` / `descriptions`; an empty text means "not
 * translated yet".
 */
export interface LocalizedTopic {
    id: number;
    name: string;
    description?: string;
    names?: Localized;
    descriptions?: Localized;
}

export interface CatalogueLanguage {
    code: string;
    label: string;
}

/** Keys the translation service gets back unchanged: `topic:7`, `topicDescription:7`, `group:family`. */
export const topicNameKey = (id: number) => `topic:${id}`;
export const topicDescriptionKey = (id: number) => `topicDescription:${id}`;
export const groupNameKey = (id: string) => `group:${id}`;

/** Marks one text of one language as machine translated and not checked by a person yet. */
export const machineMark = (lang: string, key: string) => `${lang}|${key}`;

export const textIn = (source: string, others: Localized | undefined, lang: string, sourceLang: string): string =>
    lang === sourceLang ? source : others?.[lang] ?? '';

const isBlank = (text: string | undefined) => !text || text.trim() === '';

interface TextEntry {
    key: string;
    source: string;
    others?: Localized;
}

const entriesOf = (topics: LocalizedTopic[], layout: TopicLayout): TextEntry[] => [
    ...topics.flatMap((topic) => {
        const entries: TextEntry[] = [{ key: topicNameKey(topic.id), source: topic.name, others: topic.names }];
        if (!isBlank(topic.description)) {
            entries.push({
                key: topicDescriptionKey(topic.id),
                source: topic.description ?? '',
                others: topic.descriptions,
            });
        }
        return entries;
    }),
    ...layout.map((group) => ({ key: groupNameKey(group.id), source: group.name, others: group.names })),
];

/** How many texts still have no translation in `lang`. Texts without a source text do not count. */
export const countMissing = (topics: LocalizedTopic[], layout: TopicLayout, lang: string, sourceLang: string): number =>
    lang === sourceLang
        ? 0
        : entriesOf(topics, layout).filter(
              (entry) => !isBlank(entry.source) && isBlank(textIn(entry.source, entry.others, lang, sourceLang)),
          ).length;

/** What to send to the translation service: every source text that lacks a translation in some target language. */
export const buildTranslateTexts = (
    topics: LocalizedTopic[],
    layout: TopicLayout,
    targetLangs: string[],
    sourceLang: string,
): Record<string, string> => {
    const texts: Record<string, string> = {};
    entriesOf(topics, layout).forEach((entry) => {
        if (isBlank(entry.source)) return;
        const lacking = targetLangs.some((lang) => isBlank(textIn(entry.source, entry.others, lang, sourceLang)));
        if (lacking) texts[entry.key] = entry.source;
    });
    return texts;
};

export interface MergeResult<T extends LocalizedTopic> {
    topics: T[];
    layout: TopicLayout;
    /** `machineMark` of every text that was filled in. */
    machine: string[];
}

/** Fills ONLY the gaps with the machine translations; whatever a person wrote stays untouched. */
export const mergeTranslations = <T extends LocalizedTopic>(
    topics: T[],
    layout: TopicLayout,
    translations: Record<string, Record<string, string>>,
    sourceLang: string,
): MergeResult<T> => {
    const machine: string[] = [];
    const fill = (others: Localized | undefined, key: string): Localized | undefined => {
        let next = others;
        Object.entries(translations).forEach(([lang, byKey]) => {
            const text = byKey[key];
            if (lang === sourceLang || isBlank(text) || !isBlank(next?.[lang])) return;
            next = { ...next, [lang]: text };
            machine.push(machineMark(lang, key));
        });
        return next;
    };

    return {
        topics: topics.map((topic) => {
            const names = fill(topic.names, topicNameKey(topic.id));
            const descriptions = isBlank(topic.description)
                ? topic.descriptions
                : fill(topic.descriptions, topicDescriptionKey(topic.id));
            return names === topic.names && descriptions === topic.descriptions
                ? topic
                : { ...topic, names, descriptions };
        }),
        layout: layout.map((group) => {
            const names = fill(group.names, groupNameKey(group.id));
            return names === group.names ? group : { ...group, names };
        }),
        machine,
    };
};
