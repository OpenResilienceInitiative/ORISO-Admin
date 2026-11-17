import type { CatalogueTopic } from '../../../components/TopicCatalogue';
import type { TopicLayout } from '../../../components/TopicCatalogue/topicLayout';
import type { LocalizedText, TopicCatalogueDto } from '../../../types/TopicCatalogue';

/** German is the source language of the Caritas defaults; every other language is a translation. */
export const SOURCE_LANGUAGE = 'de';

const split = (text: LocalizedText | undefined) => {
    const { [SOURCE_LANGUAGE]: source = '', ...others } = text ?? {};
    return { source, others };
};

export const toCatalogueTopics = (catalogue: TopicCatalogueDto | undefined): CatalogueTopic[] =>
    (catalogue?.topics ?? [])
        .filter((topic) => topic.status !== 'IN_DELETION')
        .map((topic) => {
            const name = split(topic.name);
            const description = split(topic.description);
            return {
                id: topic.id,
                name: name.source,
                names: name.others,
                description: description.source,
                descriptions: description.others,
                active: topic.status === 'ACTIVE',
                icon: topic.icon ?? null,
            };
        });

export const toCatalogueLayout = (catalogue: TopicCatalogueDto | undefined): TopicLayout =>
    (catalogue?.groups ?? []).map((group) => {
        const name = split(group.name);
        return {
            id: String(group.id),
            name: name.source,
            names: name.others,
            icon: group.icon ?? null,
            topicIds: group.topicIds,
        };
    });

/**
 * The languages to edit: the source language, every configured active language (so a first
 * translation can be written) and every language any stored text already uses.
 */
export const catalogueLanguageCodes = (
    catalogue: TopicCatalogueDto | undefined,
    configured: readonly string[] = [],
): string[] => {
    const codes = new Set<string>([SOURCE_LANGUAGE, ...configured]);
    catalogue?.topics.forEach((topic) => {
        Object.keys(topic.name ?? {}).forEach((code) => codes.add(code));
        Object.keys(topic.description ?? {}).forEach((code) => codes.add(code));
    });
    catalogue?.groups.forEach((group) => Object.keys(group.name ?? {}).forEach((code) => codes.add(code)));
    return Array.from(codes);
};
