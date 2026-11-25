import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { CardGrid } from '../../../components/CardGrid';
import { snackbar } from '../../../components/Snackbar';
import { TopicCatalogue, type CatalogueLanguage } from '../../../components/TopicCatalogue';
import { TopicCatalogueEditor } from '../../../components/TopicCatalogueDialog';
import { adminTranslator } from '../../../components/Journeys/journeyTranslation';
import { TopicRegistrationSwitch } from '../../Topics/List/TopicRegistrationSwitch';
import { TOPIC_CATALOGUE_KEY, useSaveTopicCatalogue, useTopicCatalogue } from '../../../hooks/useTopicCatalogue';
import { useTopicActiveMutation } from '../../../hooks/useTopicActiveMutation';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import type { TopicCatalogueDto } from '../../../types/TopicCatalogue';
import { SOURCE_LANGUAGE, catalogueLanguageCodes, toCatalogueTopics } from './topicCatalogueMapping';

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
                {catalogue ? (
                    // One view: "Bearbeiten" turns on the editing affordances in place, no second layer.
                    // A running visibility change ends with a reload; edit mode waits for it, or its
                    // snapshot would carry the old status and undo the change on save.
                    <TopicCatalogueEditor
                        variant="inline"
                        catalogue={catalogue}
                        languages={languages}
                        sourceLanguage={SOURCE_LANGUAGE}
                        editing={editing}
                        onEdit={() => setEditing(true)}
                        onCancel={() => setEditing(false)}
                        onSave={onSave}
                        onToggleActive={onToggleActive}
                        pendingTopicIds={pendingTopicIds}
                        onTranslate={adminTranslator}
                    />
                ) : (
                    <TopicCatalogue
                        topics={[]}
                        layout={[]}
                        isLoading={isLoading}
                        loadError={isError}
                        onRetry={() => refetch()}
                        languages={languages}
                        sourceLanguage={SOURCE_LANGUAGE}
                    />
                )}
            </CardGrid.Item>
        </CardGrid>
    );
};

export default TopicSettingsPage;
