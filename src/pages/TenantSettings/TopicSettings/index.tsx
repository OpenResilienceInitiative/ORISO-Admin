import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import routePathNames from '../../../appConfig';
import { CardGrid } from '../../../components/CardGrid';
import { snackbar } from '../../../components/Snackbar';
import { TopicCatalogue, type CatalogueChange, type CatalogueLanguage } from '../../../components/TopicCatalogue';
import { TOPIC_CATALOGUE_KEY, useSaveTopicCatalogue, useTopicCatalogue } from '../../../hooks/useTopicCatalogue';
import { useTopicActiveMutation } from '../../../hooks/useTopicActiveMutation';
import {
    SOURCE_LANGUAGE,
    catalogueLanguageCodes,
    toCatalogueLayout,
    toCatalogueSave,
    toCatalogueTopics,
} from './topicCatalogueMapping';

const languageLabel = (code: string, uiLanguage: string) => {
    try {
        return new Intl.DisplayNames([uiLanguage], { type: 'language' }).of(code) ?? code;
    } catch {
        return code;
    }
};

/**
 * Settings → Themen: the platform admin's topic catalogue. Every installation ships the Caritas
 * default topics with icons and translations; whatever is saved here overrides them.
 */
export const TopicSettingsPage = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: catalogue, isLoading, isError, refetch } = useTopicCatalogue();
    const { mutateAsync: saveCatalogue } = useSaveTopicCatalogue();
    const { mutateAsync: setActive } = useTopicActiveMutation();
    const [pendingTopicIds, setPendingTopicIds] = useState<number[]>([]);

    const topics = useMemo(() => toCatalogueTopics(catalogue), [catalogue]);
    const layout = useMemo(() => toCatalogueLayout(catalogue), [catalogue]);
    const languages: CatalogueLanguage[] = useMemo(
        () =>
            catalogueLanguageCodes(catalogue).map((code) => ({
                code,
                label: languageLabel(code, i18n.language || SOURCE_LANGUAGE),
            })),
        [catalogue, i18n.language],
    );

    const onSaveLayout = useCallback(
        async (change: CatalogueChange) => {
            if (!catalogue) return;
            // A rejected promise keeps the catalogue in edit mode with its own error message.
            await saveCatalogue(await toCatalogueSave(change, catalogue));
        },
        [catalogue, saveCatalogue],
    );

    const onToggleActive = useCallback(
        async (topicId: number, active: boolean) => {
            const name = topics.find((topic) => topic.id === topicId)?.name ?? '';
            setPendingTopicIds((ids) => [...ids, topicId]);
            try {
                await setActive({ id: topicId, active });
                await queryClient.invalidateQueries({ queryKey: [TOPIC_CATALOGUE_KEY] });
            } catch {
                // The last visible topic cannot be hidden (409); every other failure reads the same.
                snackbar.error({ content: t('topicCatalogue.changeError', { name }) });
            } finally {
                setPendingTopicIds((ids) => ids.filter((id) => id !== topicId));
            }
        },
        [queryClient, setActive, t, topics],
    );

    return (
        <CardGrid raster>
            <CardGrid.Item span={3}>
                <TopicCatalogue
                    topics={topics}
                    layout={layout}
                    isLoading={isLoading}
                    loadError={isError}
                    onRetry={() => refetch()}
                    onSaveLayout={onSaveLayout}
                    onToggleActive={onToggleActive}
                    pendingTopicIds={pendingTopicIds}
                    onOpenTopic={(id) => navigate(`${routePathNames.topics}/${id}`)}
                    onAddTopic={() => navigate(`${routePathNames.topics}/add`)}
                    languages={languages}
                    sourceLanguage={SOURCE_LANGUAGE}
                />
            </CardGrid.Item>
        </CardGrid>
    );
};

export default TopicSettingsPage;
