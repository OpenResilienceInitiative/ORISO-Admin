import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { ColumnProps } from 'antd/lib/table';
import InterestsOutlined from '@mui/icons-material/InterestsOutlined';
import { useNavigate } from 'react-router-dom';
import { useDebouncedCallback } from 'use-debounce';
import { GlobalSearchBar } from '../../../components/GlobalSearch';
import { M3Switch } from '../../../components/M3Switch';
import { TopicData } from '../../../types/topic';
import { Status } from '../../../types/status';
import { TopicDeletionModal } from './TopicDeletionModal';
import { Modal } from '../../../components/Modal';
import { useAppConfigContext } from '../../../context/useAppConfig';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { useFeatureContext } from '../../../context/FeatureContext';
import { FeatureFlag } from '../../../enums/FeatureFlag';
import { UserRole } from '../../../enums/UserRole';
import { Resource } from '../../../enums/Resource';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { PermissionAction } from '../../../enums/PermissionAction';
import routePathNames from '../../../appConfig';
import { useTenantAdminDataMutation } from '../../../hooks/useTenantAdminDataMutation.hook';
import { extractApiErrorMessage } from '../../../utils/extractApiErrorMessage';
import StatusIcons from '../../../components/EditableTable/StatusIcons';
import EditButtons from '../../../components/EditableTable/EditButtons';
import { Page } from '../../../components/Page';
import { PageMobileActions } from '../../../components/Page/PageMobileActions';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { ResizeTable } from '../../../components/ResizableTable';
import { useTopicList } from '../../../hooks/useTopicList';
import styles from './TopicList.module.scss';

export const TopicList = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { can } = useUserPermissions();
    const { data } = useTenantData();
    const { settings } = useAppConfigContext();
    const { isEnabled, toggleFeature } = useFeatureContext();
    const { hasRole } = useUserRoles();
    const { mutate: updateTenantData, isPending: isTopicsSwitchPending } = useTenantAdminDataMutation({
        id: `${data.id}`,
    });
    const [topicIdForDelete, setTopicIdForDelete] = useState<number>(null);
    const [switchConfirmOpen, setSwitchConfirmOpen] = useState(false);
    const [tableState, setTableState] = useState<TableState>({
        current: 1,
        sortBy: undefined,
        order: undefined,
        pageSize: 10,
    });
    const { data: topicsData, isLoading, refetch } = useTopicList({ ...tableState });
    const isTopicsFeatureActive = isEnabled(FeatureFlag.TopicsInRegistration);
    const updateSearch = useCallback((search: string) => {
        setTableState((current) => ({ ...current, current: 1, search }));
    }, []);
    const setSearchDebounced = useDebouncedCallback(updateSearch, 100);

    const onTopicsSwitch = useCallback(() => setSwitchConfirmOpen(true), []);

    const confirmTopicsSwitch = useCallback(() => {
        updateTenantData(
            { settings: { topicsInRegistrationEnabled: !isTopicsFeatureActive } },
            {
                // Keep the confirmation open until the request actually succeeds — a
                // failed PUT (network error, 500, ...) must not silently vanish and
                // leave the user thinking the toggle went through.
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

    const onCloseDeleteModal = useCallback(() => {
        setTopicIdForDelete(null);
        refetch();
    }, []);

    const columns = useMemo(
        () =>
            [
                {
                    title: t('topic.name'),
                    dataIndex: 'name',
                    key: 'name',
                    sorter: false,
                    width: 150,
                    ellipsis: true,
                    fixed: 'left',
                    className: 'topicList__column',
                },
                {
                    title: t('topic.description'),
                    dataIndex: 'description',
                    key: 'description',
                    width: 350,
                    ellipsis: true,
                    className: 'topicList__column',
                },
                {
                    title: t('topic.internalIdentifier'),
                    dataIndex: 'internalIdentifier',
                    key: 'internalIdentifier',
                    sorter: false,
                    width: 150,
                    ellipsis: true,
                },
                {
                    width: 80,
                    title: t('status'),
                    dataIndex: 'status',
                    key: 'status',
                    sorter: false,
                    ellipsis: true,
                    render: (status: Status) => {
                        return <StatusIcons status={status} />;
                    },
                },
                {
                    width: 88,
                    title: '',
                    key: 'edit',
                    render: (_: any, record: TopicData) => {
                        return (
                            <div className="tableActionWrapper">
                                <EditButtons
                                    isDisabled={record.status === 'IN_DELETION'}
                                    handleEdit={() => navigate(`/admin/topics/${record.id}`)}
                                    handleDelete={() => setTopicIdForDelete(record.id)}
                                    record={record}
                                    hide={['delete']}
                                    resource={Resource.Topic}
                                />
                            </div>
                        );
                    },
                    fixed: 'right',
                },
            ] as Array<ColumnProps<TopicData>>,
        [],
    );

    const tableChangeHandler = useCallback((pagination: any, filters: any, sorter: any) => {
        if (sorter.field) {
            const sortBy = sorter.field.toUpperCase();
            const order = sorter.order === 'descend' ? 'DESC' : 'ASC';
            setTableState({
                ...tableState,
                current: pagination.current,
                sortBy,
                order,
            });
        } else {
            setTableState({ ...tableState, current: pagination.current, pageSize: pagination.pageSize });
        }
    }, []);

    const pagination = {
        total: topicsData?.total,
        current: tableState.current,
        pageSize: tableState.pageSize,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '30'],
    };

    // When we've the multi tenancy in single tenant mode we can only show if we've the tenant admin role
    const canShowTopicSwitch =
        ((settings.multitenancyWithSingleDomainEnabled && hasRole(UserRole.TenantAdmin)) ||
            !settings.multitenancyWithSingleDomainEnabled) &&
        can(PermissionAction.Create, Resource.Topic) &&
        isEnabled(FeatureFlag.Topics);

    return (
        <Page isLoading={isLoading}>
            <Page.Title titleKey="topics.title" subTitleKey="topics.title.text" />

            <PageMobileActions
                id="topics"
                search={{
                    label: t('search-placeholder'),
                    placeholder: t('search-placeholder'),
                    onSearch: updateSearch,
                }}
                add={
                    can(PermissionAction.Create, Resource.Topic)
                        ? { label: t('new'), onAdd: () => navigate(`${routePathNames.topics}/add`) }
                        : undefined
                }
            >
                <GlobalSearchBar
                    className={styles.toolbar}
                    expandedWidth={499}
                    onSearch={updateSearch}
                    onSearchChange={setSearchDebounced}
                    searchPlaceholder={t('search-placeholder')}
                >
                    {can(PermissionAction.Create, Resource.Topic) && (
                        <Button
                            className="mb-m mr-sm"
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => navigate(`${routePathNames.topics}/add`)}
                        >
                            {t('new')}
                        </Button>
                    )}

                    {canShowTopicSwitch && (
                        <div className={styles.featureToggle}>
                            <M3Switch
                                checked={isTopicsFeatureActive}
                                disabled={isTopicsSwitchPending}
                                label={t('topics.featureToggle')}
                                onChange={() => onTopicsSwitch()}
                            />
                            {t('topics.featureToggle')}
                        </div>
                    )}
                </GlobalSearchBar>
            </PageMobileActions>

            <ResizeTable
                rowKey="id"
                columns={columns}
                dataSource={topicsData?.data || []}
                onChange={tableChangeHandler}
                pagination={pagination}
                locale={{ emptyText: t('topics.list.empty') }}
                loading={isLoading}
            />

            {topicIdForDelete && <TopicDeletionModal id={topicIdForDelete} onClose={onCloseDeleteModal} />}
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
                    confirmDisabled={isTopicsSwitchPending}
                    onConfirm={confirmTopicsSwitch}
                    onClose={() => setSwitchConfirmOpen(false)}
                />
            )}
        </Page>
    );
};
