import type { CatalogueChange, CatalogueTopic } from '../../../components/TopicCatalogue';
import type { TopicLayout } from '../../../components/TopicCatalogue/topicLayout';
import type {
    LocalizedText,
    TopicCatalogueDto,
    TopicCatalogueGroupDto,
    TopicCatalogueTopicDto,
} from '../../../types/TopicCatalogue';

/** German is the source language of the Caritas defaults; every other language is a translation. */
export const SOURCE_LANGUAGE = 'de';

const split = (text: LocalizedText | undefined) => {
    const { [SOURCE_LANGUAGE]: source = '', ...others } = text ?? {};
    return { source, others };
};

const join = (source: string, others: LocalizedText | undefined): LocalizedText => {
    const joined: LocalizedText = { [SOURCE_LANGUAGE]: source };
    Object.entries(others ?? {}).forEach(([lang, value]) => {
        if (value) joined[lang] = value;
    });
    return joined;
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

const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });

/** The picture to send: a new file becomes a data URL, a removed one an empty string (back to the default). */
const iconToSend = async (file: File | null | undefined, current: string | null | undefined) => {
    if (file === null) return '';
    if (file) return readAsDataUrl(file);
    return current ?? undefined;
};

/** Turns what the platform admin changed in the catalogue into the body of PUT /topicadmin/catalogue. */
export const toCatalogueSave = async (
    change: CatalogueChange,
    stored: TopicCatalogueDto,
): Promise<TopicCatalogueDto> => {
    const storedGroupIds = new Set(stored.groups.map((group) => String(group.id)));
    const groups: TopicCatalogueGroupDto[] = await Promise.all(
        change.layout.map(async (group) => {
            const dto: TopicCatalogueGroupDto = {
                name: join(group.name, group.names),
                topicIds: group.topicIds,
            };
            if (storedGroupIds.has(group.id)) dto.id = Number(group.id);
            const icon = await iconToSend(change.groupIconFiles[group.id], group.icon);
            if (icon !== undefined) dto.icon = icon;
            return dto;
        }),
    );
    const storedTopics = new Map(stored.topics.map((topic) => [topic.id, topic]));
    const topics: TopicCatalogueTopicDto[] = await Promise.all(
        change.topics
            .filter((topic) => storedTopics.has(topic.id))
            .map(async (topic) => {
                const original = storedTopics.get(topic.id) as TopicCatalogueTopicDto;
                const icon = await iconToSend(change.iconFiles[topic.id], topic.icon);
                return {
                    ...original,
                    name: join(topic.name, topic.names),
                    description: join(topic.description ?? '', topic.descriptions),
                    ...(icon !== undefined ? { icon } : {}),
                };
            }),
    );
    return { groups, topics };
};
