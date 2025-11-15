import { Alert, Button } from 'antd';
import { ColumnProps, TablePaginationConfig } from 'antd/lib/table';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { useDebouncedCallback } from 'use-debounce';
import { PlusOutlined } from '@ant-design/icons';
import CustomChevronDownIcon from '../../../../../components/CustomIcons/ChevronDown';
import CustomChevronUpIcon from '../../../../../components/CustomIcons/ChevronUp';
import EditButtons from '../../../../../components/EditableTable/EditButtons';
import StatusIcons from '../../../../../components/EditableTable/StatusIcons';
import SearchInput from '../../../../../components/SearchInput/SearchInput';
import { useConsultantsOrAdminsData } from '../../../../../hooks/useConsultantsOrAdminsData';
import { AgencyData } from '../../../../../types/agency';
import { CounselorData } from '../../../../../types/counselor';
import { Status } from '../../../../../types/status';
import { decodeUsername } from '../../../../../utils/encryptionHelpers';
import { ResizeTable } from '../../../../../components/ResizableTable';
import { DEFAULT_ORDER, DEFAULT_SORT } from '../../../../../api/counselor/getCounselorSearchData';
import { DeleteUserModal } from '../DeleteUser';
import { useUserPermissions } from '../../../../../hooks/useUserPermission';
import { Resource } from '../../../../../enums/Resource';
import { PermissionAction } from '../../../../../enums/PermissionAction';
import { TypeOfUser } from '../../../../../enums/TypeOfUser';
import styles from './styles.module.scss';
import { useUserRoles } from '../../../../../hooks/useUserRoles.hook';

export const UsersTableData = () => {
    const { can } = useUserPermissions();
    const navigate = useNavigate();
    const { typeOfUsers } = useParams<{ typeOfUsers: TypeOfUser }>();
    const isConsultantTab = typeOfUsers === 'consultants';
    const { t } = useTranslation();
    const [deleteUserId, setDeleteUserId] = useState<string>(null);
    const [openRows, setOpenedRows] = useState([]);
    const [search, setSearch] = useState('');
    const { isSuperAdmin } = useUserRoles();

    const [tableState, setTableState] = useState<TableState>({
        current: 1,
        sortBy: DEFAULT_SORT,
        order: DEFAULT_ORDER,
        pageSize: 10,
    });

    const {
        data: responseList,
        isLoading,
        isError,
        error,
        refetch,
    } = useConsultantsOrAdminsData({
        search,
        ...tableState,
        typeOfUser: typeOfUsers,
    });

    const setSearchDebounced = useDebouncedCallback((value) => {
        console.log('🔍 UsersTableData: Search input changed to:', value);
        console.log('🔍 UsersTableData: Resetting to page 1');
        setTableState((data) => ({ ...data, current: 1 }));
        setSearch(value);
    }, 100);

    console.log('🔍 UsersTableData: Component render state:', {
        search,
        tableState,
        isLoading,
        isError,
        hasData: !!responseList,
        dataCount: responseList?.data?.length,
        total: responseList?.total,
    });

    const onClose = useCallback(() => {
        setDeleteUserId(null);
        refetch();
    }, []);

    const handleTableAction = useCallback((pagination: TablePaginationConfig, _: any, sorter: any) => {
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
    }, []);

    const columnsData = [
        {
            title: '',
            dataIndex: 'openStatus',
            key: 'openStatus',
            width: 30,
            fixed: 'left',
            render: (_: string, record) => {
                if (record.agencies.length <= 1) return null;

                return (
                    <button
                        className="counselorList__toggle"
                        type="button"
                        onClick={() =>
                            setOpenedRows((c) =>
                                openRows.includes(record.id) ? c.filter((a) => a !== record.id) : [...c, record.id],
                            )
                        }
                    >
                        {openRows.includes(record.id) ? <CustomChevronUpIcon /> : <CustomChevronDownIcon />}
                    </button>
                );
            },
            className: 'counselorList__column',
        },
        {
            title: t('firstname'),
            dataIndex: 'firstname',
            key: 'firstname',
            sorter: (a: CounselorData, b: CounselorData) => a.firstname.localeCompare(b.firstname),
            width: 120,
            ellipsis: true,
            fixed: 'left',
            className: 'counselorList__column',
        },
        {
            title: t('lastname'),
            dataIndex: 'lastname',
            key: 'lastname',
            sorter: (a: CounselorData, b: CounselorData) => a.lastname.localeCompare(b.lastname),
            width: 130,
            ellipsis: true,
            fixed: 'left',
            className: 'counselorList__column',
        },
        {
            width: 150,
            title: t('email'),
            dataIndex: 'email',
            key: 'email',
            ellipsis: true,
            sorter: (a: CounselorData, b: CounselorData) => a.email.localeCompare(b.email),
            fixed: 'left',
            className: 'counselorList__column',
        },
        {
            width: 150,
            title: t('username'),
            dataIndex: 'username',
            key: 'username',
            ellipsis: true,
            render: (username: string) => {
                try {
                    return decodeUsername(username);
                } catch (decodeError) {
                    console.warn('Failed to decode username:', username, decodeError);
                    // Return original username if decoding fails
                    return username;
                }
            },
            fixed: 'left',
            className: 'counselorList__column',
        },
        isSuperAdmin && {
            title: t('tenantName'),
            dataIndex: 'tenantName',
            key: 'tenantName',
            width: 100,
            ellipsis: true,
            fixed: 'left',
            className: 'counselorList__column',
        },
        {
            width: 250,
            title: t('agency'),
            dataIndex: 'agencies',
            key: `agencies`,
            ellipsis: true,
            render: (agencies: AgencyData[], record) => {
                if (!agencies) {
                    return null;
                }

                const isOpen = openRows.includes(record.id);
                const visibleAgencies = isOpen ? agencies : [agencies[0]];

                return visibleAgencies.filter(Boolean).map((agencyItem) => (
                    <div key={agencyItem.id} className="counselorList__agencies">
                        <span>{agencyItem.postcode}</span>
                        <span>{agencyItem.name}</span> <span>[{agencyItem.city}]</span>
                    </div>
                ));
            },
            className: 'counselorList__column',
        },
        isConsultantTab && {
            width: 60,
            title: t('status'),
            dataIndex: 'status',
            key: 'status',
            ellipsis: true,
            render: (status: Status) => (
                <StatusIcons status={status} createdCustomLabel={t('status.CREATED.advisor.tooltip')} />
            ),
            className: 'counselorList__column',
        },
        ((can([PermissionAction.Update, PermissionAction.Delete], Resource.Consultant) && isConsultantTab) ||
            (can([PermissionAction.Update, PermissionAction.Delete], Resource.AgencyAdminUser) &&
                !isConsultantTab)) && {
            width: 80,
            title: '',
            key: 'edit',
            render: (_: unknown, record: CounselorData) => {
                return (
                    <div className="tableActionWrapper">
                        <EditButtons
                            handleEdit={() => navigate(`/admin/users/${typeOfUsers}/${record.id}`)}
                            handleDelete={() => setDeleteUserId(record.id)}
                            record={record}
                            isDisabled={record.status === 'IN_DELETION'}
                            resource={
                                typeOfUsers === TypeOfUser.Consultants ? Resource.Consultant : Resource.AgencyAdminUser
                            }
                        />
                    </div>
                );
            },
            className: 'counselorList__column',
            fixed: 'right',
        },
    ].filter(Boolean) as Array<ColumnProps<CounselorData>>;

    const pagination = {
        total: responseList?.total,
        current: tableState.current,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '30'],
    };

    return (
        <div>
            <div className={styles.searchContainer}>
                <div className={styles.searchWithButton}>
                    <SearchInput
                        placeholder={t('consultant-search-placeholder')}
                        handleOnSearch={setSearchDebounced}
                        handleOnSearchClear={() => setSearch('')}
                    />

                    {((can(PermissionAction.Create, Resource.Consultant) && isConsultantTab) ||
                        (can(PermissionAction.Create, Resource.AgencyAdminUser) && !isConsultantTab)) && (
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => navigate(`/admin/users/${typeOfUsers}/add`)}
                        >
                            {t('tenants.list.new')}
                        </Button>
                    )}
                </div>
            </div>
            {isError && (
                <Alert
                    message={t('error.loading')}
                    description={(error as any)?.message || t('error.default')}
                    type="error"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}
            <ResizeTable
                rowKey="id"
                loading={isLoading}
                columns={columnsData}
                dataSource={responseList?.data || []}
                pagination={pagination}
                onChange={handleTableAction}
            />
            {deleteUserId &&
                ((can(PermissionAction.Create, Resource.Consultant) && isConsultantTab) ||
                    (can(PermissionAction.Create, Resource.AgencyAdminUser) && !isConsultantTab)) && (
                    <DeleteUserModal
                        deleteUserId={deleteUserId}
                        onClose={onClose}
                        typeOfUser={typeOfUsers as 'consultants'}
                    />
                )}
        </div>
    );
};
