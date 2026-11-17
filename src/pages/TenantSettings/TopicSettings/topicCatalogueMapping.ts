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

/** Every language any text of the catalogue is written in, the source language first. */
export const catalogueLanguageCodes = (catalogue: TopicCatalogueDto | undefined): string[] => {
    const codes = new Set<string>([SOURCE_LANGUAGE]);
    catalogue?.topics.forEach((topic) => Object.keys(topic.name ?? {}).forEach((code) => codes.add(code)));
    catalogue?.groups.forEach((group) => Object.keys(group.name ?? {}).forEach((code) => codes.add(code)));
    return Array.from(codes);
};
