import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { message } from 'antd';
import { InterestsOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { CardGrid } from '../../../components/CardGrid';
import { Card } from '../../../components/Card';
import { M3Switch } from '../../../components/M3Switch';
import { Modal } from '../../../components/Modal';
import { Page } from '../../../components/Page';
import { TopicCatalogue, type CatalogueTopic } from '../../../components/TopicCatalogue';
import { withUnplacedTopics } from '../../../components/TopicCatalogue/topicLayout';
import { useAppConfigContext } from '../../../context/useAppConfig';
import { useFeatureContext } from '../../../context/FeatureContext';
import { FeatureFlag } from '../../../enums/FeatureFlag';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { UserRole } from '../../../enums/UserRole';
import routePathNames from '../../../appConfig';
import { useTenantAdminDataMutation } from '../../../hooks/useTenantAdminDataMutation.hook';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { useTopicActiveMutation } from '../../../hooks/useTopicActiveMutation';
import { useTopicList } from '../../../hooks/useTopicList';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { extractApiErrorMessage } from '../../../utils/extractApiErrorMessage';
import type { TopicData } from '../../../types/topic';
import styles from './TopicList.module.scss';

/** Large enough for the whole catalogue: the service answers with the full list anyway. */
const CATALOGUE_PAGE_SIZE = 500;
const ALL_TOPICS_GROUP_ID = 'all';

export const TopicList = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { can } = useUserPermissions();
    const { data: tenant } = useTenantData();
    const { settings } = useAppConfigContext();
    const { isEnabled, toggleFeature } = useFeatureContext();
    const { hasRole } = useUserRoles();
    const { mutate: updateTenantData, isPending: isTopicsSwitchPending } = useTenantAdminDataMutation({
        id: tenant?.id != null ? `${tenant.id}` : '',
    });
    const { mutateAsync: setActive } = useTopicActiveMutation();
    const [pendingTopicIds, setPendingTopicIds] = useState<number[]>([]);
    const [switchConfirmOpen, setSwitchConfirmOpen] = useState(false);
    const {
        data: topicsData,
        isLoading,
        isError,
        refetch,
    } = useTopicList({ current: 1, pageSize: CATALOGUE_PAGE_SIZE });
    const isTopicsFeatureActive = isEnabled(FeatureFlag.TopicsInRegistration);
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
                message.error({ content: t('topicCatalogue.changeError', { name }), duration: 8 });
            } finally {
                setPendingTopicIds((ids) => ids.filter((id) => id !== topicId));
            }
        },
        [setActive, t, topics],
    );

    const confirmTopicsSwitch = useCallback(() => {
        updateTenantData(
            { settings: { topicsInRegistrationEnabled: !isTopicsFeatureActive } },
            {
                // Keep the confirmation open until the request actually succeeds: a failed PUT
                // must not vanish and leave the user thinking the switch went through.
                onSuccess: () => {
                    toggleFeature(FeatureFlag.TopicsInRegistration);
                    setSwitchConfirmOpen(false);
                },
                onError: async (error) => {
                    const content = await extractApiErrorMessage(error);
                    message.error({ content, duration: 8 });
                },
            },
        );
    }, [isTopicsFeatureActive, toggleFeature, updateTenantData]);

    // With multitenancy on a single domain only the tenant admin may decide this for the tenant.
    const canShowTopicSwitch =
        ((settings.multitenancyWithSingleDomainEnabled && hasRole(UserRole.TenantAdmin)) ||
            !settings.multitenancyWithSingleDomainEnabled) &&
        can(PermissionAction.Create, Resource.Topic) &&
        isEnabled(FeatureFlag.Topics);

    return (
        <Page>
            <Page.Title titleKey="topics.title" subTitleKey="topics.title.text" />
            <CardGrid raster>
                {canShowTopicSwitch && (
                    <CardGrid.Item span={3}>
                        <Card
                            variant="dialog"
                            autoHeight
                            headerIcon={<InterestsOutlined />}
                            titleKey="topicCatalogue.registrationTitle"
                        >
                            <div className={styles.switchRow}>
                                <M3Switch
                                    id="topics-in-registration"
                                    checked={isTopicsFeatureActive}
                                    disabled={isTopicsSwitchPending || tenant?.id == null}
                                    label={t('topics.featureToggle')}
                                    onChange={() => setSwitchConfirmOpen(true)}
                                />
                                <label htmlFor="topics-in-registration">{t('topics.featureToggle')}</label>
                            </div>
                        </Card>
                    </CardGrid.Item>
                )}
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

            {switchConfirmOpen && (
                <Modal
                    titleKey={
                        isTopicsFeatureActive ? 'topics.featureToggle.off.title' : 'topics.featureToggle.on.title'
                    }
                    contentKey={
                        isTopicsFeatureActive
                            ? 'topics.featureToggle.off.description'
                            : 'topics.featureToggle.on.description'
                    }
                    icon={<InterestsOutlined />}
                    width={768}
                    cancelLabelKey="btn.cancel.uppercase"
                    okLabelKey="btn.ok.uppercase"
                    confirmDisabled={isTopicsSwitchPending || tenant?.id == null}
                    onConfirm={confirmTopicsSwitch}
                    onClose={() => setSwitchConfirmOpen(false)}
                />
            )}
        </Page>
    );
};
