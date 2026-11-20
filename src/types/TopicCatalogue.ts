/** The topic catalogue of the ConsultingTypeService (`/service/topicadmin/catalogue`). */
export type LocalizedText = Record<string, string>;

export interface TopicCatalogueGroupDto {
    /** Empty for a category created in the Admin. */
    id?: number;
    name: LocalizedText;
    /** Address or data URL; empty string on save removes the own picture. */
    icon?: string | null;
    topicIds: number[];
}

export interface TopicCatalogueTopicDto {
    id: number;
    slug?: string;
    internalIdentifier?: string;
    status: string;
    name: LocalizedText;
    description: LocalizedText;
    icon?: string | null;
    titles?: unknown;
    [field: string]: unknown;
}

export interface TopicCatalogueDto {
    groups: TopicCatalogueGroupDto[];
    topics: TopicCatalogueTopicDto[];
}
