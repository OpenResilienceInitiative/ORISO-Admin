import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Modal, Space, Switch } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { ColumnProps } from 'antd/lib/table';
import { InterestsOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { TopicData } from '../../../types/topic';
import { Status } from '../../../types/status';
import { TopicDeletionModal } from './TopicDeletionModal';
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
import StatusIcons from '../../../components/EditableTable/StatusIcons';
import EditButtons from '../../../components/EditableTable/EditButtons';
import { Page } from '../../../components/Page';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { ResizeTable } from '../../../components/ResizableTable';
import { useTopicList } from '../../../hooks/useTopicList';

export const TopicList = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { can } = useUserPermissions();
    const { data } = useTenantData();
    const { settings } = useAppConfigContext();
    const { isEnabled, toggleFeature } = useFeatureContext();
    const { hasRole } = useUserRoles();
    const { mutate: updateTenantData } = useTenantAdminDataMutation({ id: `${data.id}` });
    const [topicIdForDelete, setTopicIdForDelete] = useState<number>(null);
    const [tableState, setTableState] = useState<TableState>({
        current: 1,
        sortBy: undefined,
        order: undefined,
        pageSize: 10,
    });
    const { data: topicsData, isLoading, refetch } = useTopicList({ ...tableState });
    const isTopicsFeatureActive = isEnabled(FeatureFlag.TopicsInRegistration);

    const onTopicsSwitch = useCallback(() => {
        Modal.confirm({
            title: t(isTopicsFeatureActive ? 'topics.featureToggle.off.title' : 'topics.featureToggle.on.title'),
            content: t(
                isTopicsFeatureActive ? 'topics.featureToggle.off.description' : 'topics.featureToggle.on.description',
            ),
            width: '768px',
            icon: <InterestsOutlined />,
            onOk() {
                updateTenantData(
                    {
                        settings: {
                            topicsInRegistrationEnabled: !isTopicsFeatureActive,
                        },
                    },
                    {
                        onSuccess: () => toggleFeature(FeatureFlag.TopicsInRegistration),
                    },
                );
            },
        });
    }, [isTopicsFeatureActive]);

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

            <Space align="baseline">
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
                    <>
                        <Switch checked={isTopicsFeatureActive} onClick={onTopicsSwitch} />
                        {t('topics.featureToggle')}
                    </>
                )}
            </Space>

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
        </Page>
    );
};
