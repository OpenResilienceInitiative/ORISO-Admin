import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Grid, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { ColumnProps } from 'antd/lib/table';
import classNames from 'classnames';
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
import { PageMobileActions } from '../../../components/Page/PageMobileActions';
import { useAgenciesData } from '../../../hooks/useAgencysData';
import { ResizeTable } from '../../../components/ResizableTable';
import { GlobalSearchBar } from '../../../components/GlobalSearch';
import styles from './styles.module.scss';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { useTenantsData } from '../../../hooks/useTenantsData';
import { ReactComponent as RowExpandIcon } from '../../../resources/img/svg/table-actions/row_expand_200.svg';
import { ReactComponent as RowExpandHoverIcon } from '../../../resources/img/svg/table-actions/row_expand_400.svg';
import { ReactComponent as RowExpandSelectedIcon } from '../../../resources/img/svg/table-actions/row_expand_filled.svg';
import { getAgencyColumnSortOrder, getNextAgencyTableState } from './agencySort';
import { useDpaGate } from '../../../hooks/useDpaGate.hook';

export const AgencyList = () => {
    const screens = Grid.useBreakpoint();
    const { t, i18n } = useTranslation();
    const [tableState, setTableState] = useState<TableState>({
        current: 1,
        sortBy: undefined,
        order: undefined,
        pageSize: 10,
    });
    const [expandedTopicRows, setExpandedTopicRows] = useState<string[]>([]);
    const { data, isLoading, isError, refetch } = useAgenciesData({ ...tableState });
    const { can } = useUserPermissions();
    const { isSuperAdmin, isTenantScopedAdmin, tenantId } = useUserRoles();
    const {
        data: dpaGate,
        isLoading: isDpaGateLoading,
        isError: isDpaGateError,
    } = useDpaGate(tenantId ?? 0, isTenantScopedAdmin);
    const { data: tenantsData } = useTenantsData({ perPage: 1000, page: 1, enabled: isSuperAdmin });
    const { isEnabled } = useFeatureContext();
    const [agencyToDelete, setAgencyToDelete] = useState<AgencyData>();
    const isTopicsFeatureActive = isEnabled(FeatureFlag.TopicsInRegistration);
    const isMobile = !screens.md;
    const isAgencyCreationDpaBlocked =
        isTenantScopedAdmin && (isDpaGateLoading || isDpaGateError || dpaGate?.dpaSigned !== true);

    const navigate = useNavigate();

    const onClose = useCallback(() => {
        setAgencyToDelete(null);
        refetch();
    }, []);

    const updateSearch = useCallback((search?: string) => {
        setExpandedTopicRows([]);
        setTableState((tmpData) => ({ ...tmpData, current: 1, search }));
    }, []);
    const setSearchDebounced = useDebouncedCallback(updateSearch, 100);
    const tenantNameById = new Map(
        (tenantsData?.data || []).map((tenant) => [Number(tenant.id), String(tenant.name || '')]),
    );

    const isTopicRowExpanded = useCallback(
        (record: AgencyData) => expandedTopicRows.includes(String(record.id)),
        [expandedTopicRows],
    );

    const toggleTopicRow = useCallback((record: AgencyData) => {
        const rowId = String(record.id);
        setExpandedTopicRows((current) =>
            current.includes(rowId) ? current.filter((id) => id !== rowId) : [...current, rowId],
        );
    }, []);

    const columnsData = [
        {
            title: t('agency.list.id'),
            dataIndex: 'id',
            key: 'id',
            sorter: true,
            sortOrder: getAgencyColumnSortOrder('id', tableState),
            showSorterTooltip: false,
            width: 80,
            ellipsis: true,
            className: 'agencyList__column',
        },
        {
            title: t('agency.list.createdDate'),
            dataIndex: 'createDate',
            key: 'createDate',
            sorter: true,
            sortOrder: getAgencyColumnSortOrder('createDate', tableState),
            showSorterTooltip: false,
            width: 150,
            ellipsis: true,
            render: (createDate: string) => {
                if (!createDate || createDate === 'null') return '-';
                try {
                    const date = new Date(createDate);
                    const dateLocale = i18n.language === 'de' ? 'de-DE' : 'en-GB';
                    return date.toLocaleDateString(dateLocale, {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                    });
                } catch {
                    return createDate;
                }
            },
            className: 'agencyList__column',
        },
        {
            title: t('agency.name'),
            dataIndex: 'name',
            key: 'name',
            sorter: true,
            sortOrder: getAgencyColumnSortOrder('name', tableState),
            showSorterTooltip: false,
            width: 100,
            ellipsis: true,
            className: 'agencyList__column',
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
            sortOrder: getAgencyColumnSortOrder('postcode', tableState),
            showSorterTooltip: false,
            width: 100,
            ellipsis: true,
            className: 'agencyList__column',
        },
        {
            title: t('agency.city'),
            dataIndex: 'city',
            key: 'city',
            sorter: true,
            sortOrder: getAgencyColumnSortOrder('city', tableState),
            showSorterTooltip: false,
            width: 100,
            ellipsis: true,
            className: 'agencyList__column',
        },
        isSuperAdmin && {
            title: t('tenantName'),
            dataIndex: 'tenantName',
            key: 'tenantName',
            width: 120,
            ellipsis: true,
            render: (_: string, record: AgencyData) =>
                record.tenantName || tenantNameById.get(Number(record.tenantId)) || record.tenantId || '-',
            className: 'agencyList__column',
        },
        ...(can(PermissionAction.Read, Resource.Topic)
            ? [
                  {
                      title: t('topics.title'),
                      dataIndex: 'topics',
                      key: 'topics',
                      width: 300,
                      ellipsis: false,
                      render: (topics: TopicData[], record: AgencyData) => {
                          if (topics) {
                              const visibleTopics = [...topics].filter(Boolean);
                              const hasSingleTopic = visibleTopics.length === 1;
                              const isExpanded = isTopicRowExpanded(record);

                              if (visibleTopics.length === 0) {
                                  if (isTopicsFeatureActive) {
                                      return (
                                          <div className={classNames('TopicList__agencies', styles.topicsEmpty)}>
                                              {t('agency.noTopics')}
                                          </div>
                                      );
                                  }

                                  return null;
                              }

                              return (
                                  <div
                                      className={classNames('TopicList__agencies', styles.topicsList, {
                                          [styles.topicsListExpanded]: isExpanded,
                                      })}
                                  >
                                      {visibleTopics.map((topicItem) => (
                                          <span
                                              key={topicItem.id ?? topicItem.name}
                                              className={classNames(styles.topicChip, {
                                                  [styles.topicChipExpanded]: isExpanded,
                                                  [styles.topicChipSingle]: hasSingleTopic,
                                              })}
                                              title={topicItem.name}
                                          >
                                              {topicItem.name}
                                          </span>
                                      ))}
                                  </div>
                              );
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
            sorter: true,
            sortOrder: getAgencyColumnSortOrder('offline', tableState),
            showSorterTooltip: false,
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
            width: 140,
            title: '',
            key: 'edit',
            render: (_: any, record: AgencyData) => {
                const topicCount = Array.isArray(record.topics) ? record.topics.filter(Boolean).length : 0;
                const hasExpandableTopics = topicCount > 1;
                const topicsExpanded = isTopicRowExpanded(record);

                return (
                    <div className={classNames('tableActionWrapper', styles.agencyActionWrapper)}>
                        {can(PermissionAction.Read, Resource.Topic) && hasExpandableTopics && (
                            <button
                                className={classNames(styles.topicToggleButton, {
                                    [styles.topicToggleButtonExpanded]: topicsExpanded,
                                })}
                                type="button"
                                aria-label={topicsExpanded ? t('agency.topics.collapse') : t('agency.topics.expand')}
                                aria-expanded={topicsExpanded}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    toggleTopicRow(record);
                                }}
                            >
                                <span className={styles.topicToggleIconStack} aria-hidden="true">
                                    <RowExpandIcon
                                        className={classNames(styles.topicToggleIcon, styles.topicToggleIconDefault)}
                                    />
                                    <RowExpandHoverIcon
                                        className={classNames(styles.topicToggleIcon, styles.topicToggleIconHover)}
                                    />
                                    <RowExpandSelectedIcon
                                        className={classNames(styles.topicToggleIcon, styles.topicToggleIconSelected)}
                                    />
                                </span>
                            </button>
                        )}
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
            fixed: isMobile ? undefined : 'right',
        },
    ] as Array<ColumnProps<AgencyData>>;

    const tableChangeHandler = (pagination: any, filters: any, sorter: any) => {
        setExpandedTopicRows([]);
        setTableState((currentState) => getNextAgencyTableState(currentState, pagination, sorter));
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
                <PageMobileActions
                    id="agencies"
                    search={{
                        label: t('agency.list.searchPlaceholder'),
                        placeholder: t('agency.list.searchPlaceholder'),
                        onSearch: updateSearch,
                    }}
                    add={
                        can(PermissionAction.Create, Resource.Agency) && !isAgencyCreationDpaBlocked
                            ? { label: t('new'), onAdd: () => navigate(routePathNames.agencyAdd) }
                            : undefined
                    }
                >
                    <div className={styles.searchNewContainer}>
                        <GlobalSearchBar
                            className={styles.searchField}
                            expandedWidth={499}
                            onSearch={updateSearch}
                            onSearchChange={setSearchDebounced}
                            searchPlaceholder={t('agency.list.searchPlaceholder')}
                        >
                            {can(PermissionAction.Create, Resource.Agency) && (
                                <div className={styles.toolbarActions}>
                                    <Button
                                        className={styles.addButton}
                                        type="primary"
                                        icon={<PlusOutlined className={styles.addButtonIcon} />}
                                        disabled={isAgencyCreationDpaBlocked}
                                        title={isAgencyCreationDpaBlocked ? t('agency.dpaGate.title') : undefined}
                                        onClick={() => navigate(`${routePathNames.agencyAdd}`)}
                                    >
                                        {t('new')}
                                    </Button>
                                </div>
                            )}
                        </GlobalSearchBar>
                    </div>
                </PageMobileActions>
            </Page.Title>

            <div className={styles.tableContainer}>
                <ResizeTable
                    loading={isLoading}
                    columns={columnsData}
                    dataSource={data?.data || []}
                    pagination={pagination}
                    onChange={tableChangeHandler}
                    rowKey="id"
                    locale={{
                        emptyText: isError ? t('message.error.default') : t('tenants.list.empty'),
                    }}
                />
            </div>
            {agencyToDelete && <AgencyDeletionModal agencyModel={agencyToDelete} onClose={onClose} />}
        </Page>
    );
};
