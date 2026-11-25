import type { LocalizedText } from '../../types/TopicCatalogue';

/** What the dialog keeps per topic and category; only the texts matter here. */
export interface TranslatableTopic {
    id: number;
    name: LocalizedText;
    description: LocalizedText;
}

export interface TranslatableGroup {
    key: string;
    name: LocalizedText;
}

const topicKey = (id: number, field: 'name' | 'description') => `topic:${id}:${field}`;
const groupKey = (key: string) => `group:${key}`;

const has = (value: LocalizedText | undefined, lang: string) => Boolean(value?.[lang]?.trim());

/**
 * The source texts the machine should translate: every topic name, topic description and category name
 * that has a source text but lacks it in at least one other language. `targets` are only the languages
 * that miss something, so a complete language costs nothing.
 */
export const collectMissingTexts = (
    topics: TranslatableTopic[],
    groups: TranslatableGroup[],
    languages: string[],
    sourceLanguage: string,
): { texts: Record<string, string>; targets: string[] } => {
    const others = languages.filter((code) => code !== sourceLanguage);
    const texts: Record<string, string> = {};
    const targets = new Set<string>();
    const consider = (key: string, value: LocalizedText | undefined) => {
        const source = value?.[sourceLanguage]?.trim();
        if (!source) return;
        const missing = others.filter((code) => !has(value, code));
        if (missing.length === 0) return;
        texts[key] = source;
        missing.forEach((code) => targets.add(code));
    };
    topics.forEach((topic) => {
        consider(topicKey(topic.id, 'name'), topic.name);
        consider(topicKey(topic.id, 'description'), topic.description);
    });
    groups.forEach((group) => consider(groupKey(group.key), group.name));
    return { texts, targets: others.filter((code) => targets.has(code)) };
};

/** The provider answers in HTML; topic and category texts are plain, so tags and entities go. */
export const toPlainText = (html: string) =>
    html
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();

/**
 * Puts the machine's answers into the empty fields only. Anything an admin typed meanwhile, or that was
 * already translated, stays as it is.
 */
export const applyMachineTranslations = <T extends TranslatableTopic, G extends TranslatableGroup>(
    topics: T[],
    groups: G[],
    translations: Record<string, Record<string, string>>,
    sourceLanguage: string,
): { topics: T[]; groups: G[]; changedTopicIds: number[]; filled: number } => {
    let filled = 0;
    const changed = new Set<number>();
    const fill = (value: LocalizedText, key: string): LocalizedText => {
        let next = value;
        Object.entries(translations).forEach(([lang, byKey]) => {
            if (lang === sourceLanguage) return;
            const answer = byKey?.[key];
            if (answer === undefined || has(next, lang)) return;
            const plain = toPlainText(answer);
            if (!plain) return;
            next = { ...next, [lang]: plain };
            filled += 1;
        });
        return next;
    };
    const nextTopics = topics.map((topic) => {
        const name = fill(topic.name, topicKey(topic.id, 'name'));
        const description = fill(topic.description, topicKey(topic.id, 'description'));
        if (name === topic.name && description === topic.description) return topic;
        changed.add(topic.id);
        return { ...topic, name, description };
    });
    const nextGroups = groups.map((group) => {
        const name = fill(group.name, groupKey(group.key));
        return name === group.name ? group : { ...group, name };
    });
    return { topics: nextTopics, groups: nextGroups, changedTopicIds: [...changed], filled };
};
