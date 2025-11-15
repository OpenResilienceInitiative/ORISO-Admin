import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { ColumnProps } from 'antd/lib/table';
import { useNavigate } from 'react-router-dom';
import { useDebouncedCallback } from 'use-debounce';
import EditButtons from '../../../components/EditableTable/EditButtons';
import { AgencyData } from '../../../types/agency';
import { Status } from '../../../types/status';
import StatusIcons from '../../../components/EditableTable/StatusIcons';
import { AgencyDeletionModal } from './AgencyDeletionModal';
import { useFeatureContext } from '../../../context/FeatureContext';
import { TopicData } from '../../../types/topic';
import routePathNames from '../../../appConfig';
import { FeatureFlag } from '../../../enums/FeatureFlag';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { Page } from '../../../components/Page';
import { useAgenciesData } from '../../../hooks/useAgencysData';
import { ResizeTable } from '../../../components/ResizableTable';
import styles from './styles.module.scss';
import SearchInput from '../../../components/SearchInput/SearchInput';

export const AgencyList = () => {
    const { t } = useTranslation();
    const [tableState, setTableState] = useState<TableState>({
        current: 1,
        sortBy: undefined,
        order: undefined,
        pageSize: 10,
    });
    const { data, isLoading, refetch } = useAgenciesData({ ...tableState });
    const { can } = useUserPermissions();
    const { isEnabled } = useFeatureContext();
    const [agencyToDelete, setAgencyToDelete] = useState<AgencyData>();
    const isTopicsFeatureActive = isEnabled(FeatureFlag.TopicsInRegistration);

    const navigate = useNavigate();

    const onClose = useCallback(() => {
        setAgencyToDelete(null);
        refetch();
    }, []);

    const setSearchDebounced = useDebouncedCallback((search?: string) => {
        setTableState((tmpData) => ({ ...tmpData, current: 1, search }));
    }, 100);

    const columnsData = [
        {
            title: t('agency.name'),
            dataIndex: 'name',
            key: 'name',
            sorter: true,
            width: 100,
            ellipsis: true,
            className: 'agencyList__column',
            fixed: 'left',
        },
        {
            title: t('agency.description'),
            dataIndex: 'description',
            key: 'description',
            width: 200,
            ellipsis: true,
            className: 'agencyList__column',
        },
        {
            title: t('agency.postcode'),
            dataIndex: 'postcode',
            key: 'postcode',
            sorter: true,
            width: 100,
            ellipsis: true,
            className: 'agencyList__column',
        },
        {
            title: t('agency.city'),
            dataIndex: 'city',
            key: 'city',
            sorter: true,
            width: 100,
            ellipsis: true,
            className: 'agencyList__column',
        },
        ...(can(PermissionAction.Read, Resource.Topic)
            ? [
                  {
                      title: t('topics.title'),
                      dataIndex: 'topics',
                      key: 'topics',
                      width: 100,
                      ellipsis: true,
                      render: (topics: TopicData[]) => {
                          if (topics) {
                              const visibleTopics = [...topics];

                              if (isTopicsFeatureActive && visibleTopics.length === 0) {
                                  return (
                                      <div className="TopicList__agencies" style={{ color: 'red' }}>
                                          {t('agency.noTopics')}
                                      </div>
                                  );
                              }

                              return visibleTopics.map((topicItem) => {
                                  return topicItem ? (
                                      <div key={topicItem.id} className="TopicList__agencies">
                                          <span>{topicItem.name}</span>
                                      </div>
                                  ) : (
                                      ''
                                  );
                              });
                          }

                          return null;
                      },
                      className: 'agencyList__column',
                  },
              ]
            : []),
        {
            title: t('agency.online.title'),
            dataIndex: 'offline',
            key: 'offline',
            sorter: (a, b) => (a.offline > b.offline ? 1 : -1),
            width: 100,
            ellipsis: true,
            render: (offline: Boolean) => {
                return offline ? (
                    <Tag className={styles.tagOffline}>{t('agency.status.offline')}</Tag>
                ) : (
                    <Tag className={styles.tagOnline}>{t('agency.status.online')}</Tag>
                );
            },
            className: 'agencyListOnline__column',
        },
        {
            width: 60,
            title: t('status'),
            dataIndex: 'status',
            key: 'status',
            ellipsis: true,
            render: (status: Status) => {
                return <StatusIcons status={status} />;
            },
            className: 'agencyList__column',
        },
        {
            width: 80,
            title: '',
            key: 'edit',
            render: (_: any, record: AgencyData) => {
                return (
                    <div className="tableActionWrapper">
                        <EditButtons
                            isDisabled={record.status === 'IN_DELETION'}
                            handleEdit={() => {
                                navigate(`${routePathNames.agency}/${record.id}`);
                            }}
                            handleDelete={() => setAgencyToDelete(record)}
                            record={record}
                            resource={Resource.Agency}
                        />
                    </div>
                );
            },
            className: 'agencyList__column',
            fixed: 'right',
        },
    ] as Array<ColumnProps<AgencyData>>;

    const tableChangeHandler = (pagination: any, filters: any, sorter: any) => {
        const { current, pageSize } = pagination;
        if (sorter.field) {
            const sortBy = sorter.field.toUpperCase();
            const order = sorter.order === 'descend' ? 'DESC' : 'ASC';
            setTableState({
                ...tableState,
                current,
                pageSize,
                sortBy,
                order,
            });
        } else {
            setTableState({ ...tableState, current, pageSize });
        }
    };

    const pagination = {
        total: data?.total,
        current: tableState.current,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '30'],
    };

    return (
        <Page>
            <Page.Title
                titleKey="agency"
                subTitleKey={`agency.title.text${can(PermissionAction.Create, Resource.Agency) ? '' : '.self'}`}
            >
                <div className={styles.searchNewContainer}>
                    <SearchInput
                        placeholder={t('agency.list.searchPlaceholder')}
                        handleOnSearch={setSearchDebounced}
                        handleOnSearchClear={() => setSearchDebounced('')}
                    />
                    {can(PermissionAction.Create, Resource.Agency) && (
                        <Button
                            className="mb-m mr-sm"
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => navigate(`${routePathNames.agencyAdd}`)}
                        >
                            {t('new')}
                        </Button>
                    )}
                </div>
            </Page.Title>

            <ResizeTable
                loading={isLoading}
                columns={columnsData}
                dataSource={data?.data || []}
                pagination={pagination}
                onChange={tableChangeHandler}
                rowKey="id"
                locale={{ emptyText: t('tenants.list.empty') }}
            />
            {agencyToDelete && <AgencyDeletionModal agencyModel={agencyToDelete} onClose={onClose} />}
        </Page>
    );
};
