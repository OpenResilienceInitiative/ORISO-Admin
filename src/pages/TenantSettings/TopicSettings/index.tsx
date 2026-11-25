import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { CardGrid } from '../../../components/CardGrid';
import { snackbar } from '../../../components/Snackbar';
import { TopicCatalogue, type CatalogueLanguage } from '../../../components/TopicCatalogue';
import { TopicCatalogueDialog } from '../../../components/TopicCatalogueDialog';
import { TopicRegistrationSwitch } from '../../Topics/List/TopicRegistrationSwitch';
import { TOPIC_CATALOGUE_KEY, useSaveTopicCatalogue, useTopicCatalogue } from '../../../hooks/useTopicCatalogue';
import { useTopicActiveMutation } from '../../../hooks/useTopicActiveMutation';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { withUnplacedTopics } from '../../../components/TopicCatalogue/topicLayout';
import type { TopicCatalogueDto } from '../../../types/TopicCatalogue';
import { translateLegalTexts } from '../../../api/tenant/translation';
import { SOURCE_LANGUAGE, catalogueLanguageCodes, toCatalogueLayout, toCatalogueTopics } from './topicCatalogueMapping';

const UNPLACED_GROUP_ID = 'without-category';

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
    const queryClient = useQueryClient();
    const { data: catalogue, isLoading, isError, refetch } = useTopicCatalogue();
    const { mutateAsync: saveCatalogue } = useSaveTopicCatalogue();
    const { mutateAsync: setActive } = useTopicActiveMutation();
    const [pendingTopicIds, setPendingTopicIds] = useState<number[]>([]);
    const [editing, setEditing] = useState(false);

    const topics = useMemo(() => toCatalogueTopics(catalogue), [catalogue]);
    const { data: tenantData } = useTenantData();
    const configuredLanguages = tenantData?.settings?.activeLanguages;
    // Topics in no category stay reachable (and switchable) in a display-only group that is never saved.
    const layout = useMemo(
        () =>
            withUnplacedTopics(
                toCatalogueLayout(catalogue),
                topics.map((topic) => topic.id),
                { id: UNPLACED_GROUP_ID, name: t('topicCatalogue.withoutCategory') },
            ),
        [catalogue, topics, t],
    );
    const languages: CatalogueLanguage[] = useMemo(
        () =>
            catalogueLanguageCodes(catalogue, configuredLanguages).map((code) => ({
                code,
                label: languageLabel(code, i18n.language || SOURCE_LANGUAGE),
            })),
        [catalogue, configuredLanguages, i18n.language],
    );

    const onSave = useCallback(
        async (body: TopicCatalogueDto) => {
            // A rejected promise keeps the dialog open with its own error message.
            await saveCatalogue(body);
            setEditing(false);
        },
        [saveCatalogue],
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
            {/* /admin/topics sends the platform admin here, so the registration switch must live here too. */}
            <TopicRegistrationSwitch />
            <CardGrid.Item span={3}>
                <TopicCatalogue
                    topics={topics}
                    layout={layout}
                    isLoading={isLoading}
                    loadError={isError}
                    onRetry={() => refetch()}
                    onEdit={() => setEditing(true)}
                    onToggleActive={onToggleActive}
                    pendingTopicIds={pendingTopicIds}
                    onOpenTopic={() => setEditing(true)}
                    onAddTopic={() => setEditing(true)}
                    languages={languages}
                    sourceLanguage={SOURCE_LANGUAGE}
                />
                {/* A running visibility change ends with a reload; the editor waits for it, or its
                    snapshot would carry the old status and undo the change on save. */}
                {editing && catalogue && pendingTopicIds.length === 0 && (
                    <TopicCatalogueDialog
                        catalogue={catalogue}
                        languages={languages}
                        sourceLanguage={SOURCE_LANGUAGE}
                        onSave={onSave}
                        onClose={() => setEditing(false)}
                        onTranslate={translateLegalTexts}
                    />
                )}
            </CardGrid.Item>
        </CardGrid>
    );
};

export default TopicSettingsPage;
