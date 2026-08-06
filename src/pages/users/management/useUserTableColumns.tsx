import { CheckOutlined, HistoryOutlined } from '@ant-design/icons';

import { ColumnProps } from 'antd/lib/table';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ReactComponent as RowExpandIcon } from '../../../resources/img/svg/table-actions/row_expand_200.svg';
import { ReactComponent as RowExpandHoverIcon } from '../../../resources/img/svg/table-actions/row_expand_400.svg';
import { ReactComponent as RowExpandSelectedIcon } from '../../../resources/img/svg/table-actions/row_expand_filled.svg';
import EditButtons from '../../../components/EditableTable/EditButtons';
import StatusIcons from '../../../components/EditableTable/StatusIcons';
import { CopyToClipboard } from '../../../components/CopyToClipboard';
import { TypeOfUser } from '../../../enums/TypeOfUser';
import { AgencyData } from '../../../types/agency';
import { CounselorData } from '../../../types/counselor';
import { TenantData } from '../../../types/tenant';
import decodeHTML from '../../../utils/decodeHTML';
import { decodeUsername } from '../../../utils/encryptionHelpers';
import { getDomain } from '../../../utils/getDomain';
import { formatLastUpdated } from './formatLastUpdated';
import { getVisibleColumns, USER_TABLE_CONFIGS, UserTableColumnKey } from './userTableConfigs';
import { resolveDisplayStatus } from '../../../types/userDisplayStatus';
import tenantAdminStyles from '../List/components/TenantAdminsTableData/styles.module.scss';
import tableStyles from './UserManagementTable.module.scss';

const SORT_FIELD_BY_COLUMN: Partial<Record<UserTableColumnKey, string>> = {
    lastUpdated: 'UPDATE_DATE',
    lastname: 'LASTNAME',
    firstname: 'FIRSTNAME',
    email: 'EMAIL',
    username: 'USERNAME',
    tenantOrgName: 'NAME',
};

const getColumnSortOrder = (
    columnKey: UserTableColumnKey,
    sortBy?: string,
    order?: string,
): 'ascend' | 'descend' | undefined => {
    const apiField = SORT_FIELD_BY_COLUMN[columnKey];
    if (!apiField || !sortBy || apiField !== sortBy) return undefined;
    return order === 'DESC' ? 'descend' : 'ascend';
};

type TableRow = CounselorData | TenantData;

interface UseUserTableColumnsParams {
    sectionId: TypeOfUser;
    showTenant: boolean;
    showSubdomain: boolean;
    openRows: string[];
    onToggleRow: (id: string) => void;
    onEditUser: (record: CounselorData) => void;
    onDeleteUser: (record: CounselorData) => void;
    onEditTenant?: (record: TenantData) => void;
    onDeleteTenant?: (record: TenantData) => void;
    canEditOrDelete: boolean;
    mainTenantSubdomain?: string;
    figmaTableHeader?: boolean;
    fixActionsColumn?: boolean;
    sortBy?: string;
    order?: string;
}

export const useUserTableColumns = ({
    sectionId,
    showTenant,
    showSubdomain,
    openRows,
    onToggleRow,
    onEditUser,
    onDeleteUser,
    onEditTenant,
    onDeleteTenant,
    canEditOrDelete,
    mainTenantSubdomain,
    figmaTableHeader = false,
    fixActionsColumn = true,
    sortBy,
    order,
}: UseUserTableColumnsParams) => {
    const { t } = useTranslation();
    const config = USER_TABLE_CONFIGS[sectionId];
    const isOrganizations = config.sectionKind === 'organizations';
    const visibleColumns = getVisibleColumns(sectionId, { showTenant, showSubdomain });

    return useMemo(() => {
        const getDataIndex = (columnKey: UserTableColumnKey): string => {
            const indexByKey: Partial<Record<UserTableColumnKey, string>> = {
                agency: 'agencies',
                tenantOrgName: 'name',
                tenant: 'tenantName',
                tenantId: 'id',
                maxConsultants: 'beraterCount',
            };
            if (indexByKey[columnKey]) {
                return indexByKey[columnKey] as string;
            }
            if (columnKey === 'subdomain') {
                return isOrganizations ? 'subdomain' : 'tenantSubdomain';
            }
            return columnKey;
        };

        const buildAgencyCell = (agencies: AgencyData[], record: CounselorData) => {
            if (!agencies?.length) {
                return null;
            }
            const isOpen = openRows.includes(record.id);
            const visibleAgencies = isOpen ? agencies : [agencies[0]];

            // Each chip label lives in its own element: `text-overflow: ellipsis` is ignored on
            // the anonymous flex item of an `inline-flex` chip, which sliced long names mid-word.
            const chip = (variant: 'postcode' | 'name' | 'city', value?: string) => (
                <span
                    className={`counselorList__agencyChip counselorList__agencyChip--${variant}`}
                    title={value || undefined}
                >
                    <span className="counselorList__agencyChipLabel">{value}</span>
                </span>
            );

            return visibleAgencies.filter(Boolean).map((agencyItem) => (
                <div key={agencyItem.id} className="counselorList__agencies">
                    {chip('postcode', agencyItem.postcode)}
                    {chip('name', agencyItem.name)}
                    {chip('city', agencyItem.city)}
                </div>
            ));
        };

        const columns: Array<ColumnProps<TableRow>> = visibleColumns.map((columnConfig) => {
            const { key, width, sortable } = columnConfig;
            const apiSortField = SORT_FIELD_BY_COLUMN[key];

            const base: ColumnProps<TableRow> = {
                key,
                dataIndex: getDataIndex(key),
                width,
                ellipsis: key !== 'agency',
                className: 'counselorList__column',
                ...(sortable && apiSortField
                    ? {
                          sorter: true,
                          sortOrder: getColumnSortOrder(key, sortBy, order),
                          showSorterTooltip: false,
                      }
                    : {}),
            };

            switch (key) {
                case 'tenantOrgName':
                    return {
                        ...base,
                        title: t('tenants.list.name'),
                        render: (name: string) => <>{decodeHTML(name)}</>,
                    };
                case 'tenantId':
                    return {
                        ...base,
                        title: t('tenants.list.tenantId'),
                        dataIndex: 'id',
                    };
                case 'maxConsultants':
                    return {
                        ...base,
                        title: t('tenants.list.maxConsultants'),
                        dataIndex: 'beraterCount',
                    };
                case 'lastUpdated':
                    return {
                        ...base,
                        title: figmaTableHeader ? (
                            <span className={tableStyles.lastUpdatedHeader}>
                                <HistoryOutlined className={tableStyles.historyIcon} aria-hidden />
                                {t('users.table.lastUpdated')}
                            </span>
                        ) : (
                            t('users.table.lastUpdated')
                        ),
                        render: (_: unknown, record: TableRow) => (
                            <span title={formatLastUpdated(record as CounselorData, false)}>
                                {formatLastUpdated(record as CounselorData, true)}
                            </span>
                        ),
                    };
                case 'status':
                    return {
                        ...base,
                        title: t('status'),
                        render: (_: unknown, record: TableRow) => (
                            <StatusIcons
                                status={resolveDisplayStatus(record as CounselorData)}
                                createdCustomLabel={t('status.CREATED.advisor.tooltip')}
                            />
                        ),
                    };
                case 'lastname':
                    return { ...base, title: t('lastname') };
                case 'firstname':
                    return { ...base, title: t('firstname') };
                case 'email':
                    return {
                        ...base,
                        title: sectionId === TypeOfUser.TenantAdmins ? t('tenantAdmins.list.email') : t('email'),
                        render: (email: string) =>
                            sectionId === TypeOfUser.TenantAdmins ? (
                                <CopyToClipboard className={tenantAdminStyles.email} key={email}>
                                    {email}
                                </CopyToClipboard>
                            ) : (
                                email
                            ),
                    };
                case 'username':
                    return {
                        ...base,
                        title: t('username'),
                        render: (username: string) => {
                            try {
                                return decodeUsername(username);
                            } catch {
                                return username;
                            }
                        },
                    };
                case 'hasOtherIdentity': {
                    // Identity-specific, read-only checkmark for the *other* identity:
                    // consultants table → "also Träger-Admin"; admin tables → "also Berater*in".
                    const isConsultantSection = sectionId === TypeOfUser.Consultants;
                    const titleKey = isConsultantSection ? 'users.table.alsoTenantAdmin' : 'users.table.alsoConsultant';
                    return {
                        ...base,
                        title: t(titleKey),
                        render: (_: unknown, record: TableRow) => {
                            const row = record as CounselorData;
                            const hasOtherIdentityForSection = isConsultantSection
                                ? (row.otherIdentityTypes || []).includes('TENANT_ADMIN')
                                : !!row.hasOtherIdentity;
                            return hasOtherIdentityForSection ? (
                                <CheckOutlined data-testid="other-identity-checkmark" aria-label={t(titleKey)} />
                            ) : null;
                        },
                    };
                }
                case 'agency':
                    return {
                        ...base,
                        title: t('agency'),
                        render: (agencies: AgencyData[], record: TableRow) =>
                            buildAgencyCell(agencies, record as CounselorData),
                    };
                case 'tenant':
                    return { ...base, title: t('tenantName'), dataIndex: 'tenantName' };
                case 'subdomain':
                    return {
                        ...base,
                        title: isOrganizations ? t('tenants.list.subdomain') : t('tenantAdmins.form.subdomain'),
                        render: (subdomain: string) => (
                            <Link
                                target="_blank"
                                to={`//${getDomain(subdomain)}`}
                                className={tenantAdminStyles.subdomain}
                            >
                                {getDomain(subdomain)}
                            </Link>
                        ),
                    };
                case 'actions':
                    return {
                        ...base,
                        title: '',
                        fixed: fixActionsColumn ? 'right' : undefined,
                        render: (_: unknown, record: TableRow) => {
                            if (isOrganizations) {
                                const tenant = record as TenantData;
                                return (
                                    <div className="tableActionWrapper userTableActions">
                                        {canEditOrDelete && onEditTenant && onDeleteTenant && (
                                            <EditButtons
                                                handleEdit={() => onEditTenant(tenant)}
                                                handleDelete={() => onDeleteTenant(tenant)}
                                                record={tenant}
                                                hide={[]}
                                                disabled={{
                                                    edit: false,
                                                    delete: mainTenantSubdomain === tenant.subdomain,
                                                }}
                                                resource={config.updateResource}
                                            />
                                        )}
                                    </div>
                                );
                            }

                            const user = record as CounselorData;
                            const canExpand = config.showAgencyExpand && (user.agencies?.length ?? 0) > 1;
                            const isOpen = openRows.includes(user.id);

                            return (
                                <div className="tableActionWrapper userTableActions">
                                    {canExpand && (
                                        <button
                                            type="button"
                                            className={`counselorList__toggle counselorList__toggle--inline${
                                                isOpen ? ' counselorList__toggle--expanded' : ''
                                            }`}
                                            aria-expanded={isOpen}
                                            aria-label={isOpen ? t('users.table.collapse') : t('users.table.expand')}
                                            onClick={() => onToggleRow(user.id)}
                                        >
                                            <span className="counselorList__toggleIconStack" aria-hidden="true">
                                                <RowExpandIcon className="counselorList__toggleIcon counselorList__toggleIcon--default" />
                                                <RowExpandHoverIcon className="counselorList__toggleIcon counselorList__toggleIcon--hover" />
                                                <RowExpandSelectedIcon className="counselorList__toggleIcon counselorList__toggleIcon--selected" />
                                            </span>
                                        </button>
                                    )}
                                    {canEditOrDelete && (
                                        <EditButtons
                                            handleEdit={() => onEditUser(user)}
                                            handleDelete={() => onDeleteUser(user)}
                                            record={user}
                                            isDisabled={user.status === 'IN_DELETION'}
                                            resource={config.updateResource}
                                        />
                                    )}
                                </div>
                            );
                        },
                    };
                default:
                    return base;
            }
        });

        return columns;
    }, [
        visibleColumns,
        config,
        sectionId,
        isOrganizations,
        openRows,
        onToggleRow,
        onEditUser,
        onDeleteUser,
        onEditTenant,
        onDeleteTenant,
        canEditOrDelete,
        mainTenantSubdomain,
        figmaTableHeader,
        fixActionsColumn,
        t,
        showTenant,
        showSubdomain,
        sortBy,
        order,
    ]);
};

export const mapSorterToApiField = (columnKey?: string): string | undefined => {
    if (!columnKey) return undefined;
    return SORT_FIELD_BY_COLUMN[columnKey as UserTableColumnKey];
};
