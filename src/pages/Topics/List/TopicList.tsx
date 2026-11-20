import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CardGrid } from '../../../components/CardGrid';
import { snackbar } from '../../../components/Snackbar';
import { Page } from '../../../components/Page';
import { TopicCatalogue, type CatalogueTopic } from '../../../components/TopicCatalogue';
import { withUnplacedTopics } from '../../../components/TopicCatalogue/topicLayout';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import routePathNames from '../../../appConfig';
import { useTopicActiveMutation } from '../../../hooks/useTopicActiveMutation';
import { useTopicList } from '../../../hooks/useTopicList';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import type { TopicData } from '../../../types/topic';
import { TopicRegistrationSwitch } from './TopicRegistrationSwitch';

/** Large enough for the whole catalogue: the service answers with the full list anyway. */
const CATALOGUE_PAGE_SIZE = 500;
const ALL_TOPICS_GROUP_ID = 'all';

export const TopicList = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { can } = useUserPermissions();
    const { mutateAsync: setActive } = useTopicActiveMutation();
    const [pendingTopicIds, setPendingTopicIds] = useState<number[]>([]);
    const {
        data: topicsData,
        isLoading,
        isError,
        refetch,
    } = useTopicList({ current: 1, pageSize: CATALOGUE_PAGE_SIZE });
    const canChange = can(PermissionAction.Update, Resource.Topic);

    const topics: CatalogueTopic[] = useMemo(
        () =>
            (topicsData?.data ?? [])
                .filter((topic: TopicData) => topic.status !== 'IN_DELETION')
                .map((topic: TopicData) => ({
                    id: topic.id as number,
                    name: topic.name,
                    description: topic.description,
                    active: topic.status === 'ACTIVE',
                })),
        [topicsData],
    );

    /*
     * The service keeps no categories and no order yet (see the backend gaps in the PR), so the
     * catalogue shows one group, in the order the service sends. `onSaveLayout` stays unset on
     * purpose: without a place to save it, an edit mode would only pretend.
     */
    const layout = useMemo(
        () =>
            withUnplacedTopics(
                [],
                topics.map((topic) => topic.id),
                { id: ALL_TOPICS_GROUP_ID, name: t('topicCatalogue.allTopics') },
            ),
        [topics, t],
    );

    /*
     * `mutateAsync` with its own try/finally per call: the callbacks of `mutate` only run for the latest
     * call of a shared mutation, so toggling topic B before topic A is saved would leave A locked.
     */
    const onToggleActive = useCallback(
        async (topicId: number, active: boolean) => {
            const name = topics.find((topic) => topic.id === topicId)?.name ?? '';
            setPendingTopicIds((ids) => [...ids, topicId]);
            try {
                await setActive({ id: topicId, active });
            } catch {
                snackbar.error({ content: t('topicCatalogue.changeError', { name }) });
            } finally {
                setPendingTopicIds((ids) => ids.filter((id) => id !== topicId));
            }
        },
        [setActive, t, topics],
    );

    return (
        <Page>
            <Page.Title titleKey="topics.title" subTitleKey="topics.title.text" />
            <CardGrid raster>
                <TopicRegistrationSwitch />
                <CardGrid.Item span={3}>
                    <TopicCatalogue
                        topics={topics}
                        layout={layout}
                        isLoading={isLoading}
                        loadError={isError}
                        onRetry={() => refetch()}
                        onToggleActive={canChange ? onToggleActive : undefined}
                        pendingTopicIds={pendingTopicIds}
                        onOpenTopic={canChange ? (id) => navigate(`${routePathNames.topics}/${id}`) : undefined}
                        onAddTopic={
                            can(PermissionAction.Create, Resource.Topic)
                                ? () => navigate(`${routePathNames.topics}/add`)
                                : undefined
                        }
                        readOnlyReason={canChange ? undefined : t('topicCatalogue.readOnly')}
                    />
                </CardGrid.Item>
            </CardGrid>
        </Page>
    );
};
