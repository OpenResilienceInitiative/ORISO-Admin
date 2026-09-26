import { ColumnProps } from 'antd/lib/table';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import EditButtons from '../../../components/EditableTable/EditButtons';
import { TypeOfUser } from '../../../enums/TypeOfUser';
import { TenantData } from '../../../types/tenant';
import decodeHTML from '../../../utils/decodeHTML';
import { getDomain } from '../../../utils/getDomain';
import { getVisibleColumns, USER_TABLE_CONFIGS, UserTableColumnKey } from './userTableConfigs';
import tenantAdminStyles from '../List/components/TenantAdminsTableData/styles.module.scss';

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

interface UseUserTableColumnsParams {
    showSubdomain: boolean;
    onEditTenant: (record: TenantData) => void;
    onDeleteTenant: (record: TenantData) => void;
    canEditOrDelete: boolean;
    mainTenantSubdomain?: string;
    fixActionsColumn?: boolean;
    sortBy?: string;
    order?: string;
}

/** Columns of the Träger (tenants) tab; the person tabs render `UserDataTable`. */
export const useUserTableColumns = ({
    showSubdomain,
    onEditTenant,
    onDeleteTenant,
    canEditOrDelete,
    mainTenantSubdomain,
    fixActionsColumn = true,
    sortBy,
    order,
}: UseUserTableColumnsParams) => {
    const { t } = useTranslation();
    const config = USER_TABLE_CONFIGS[TypeOfUser.Tenants];

    return useMemo(() => {
        const visibleColumns = getVisibleColumns(TypeOfUser.Tenants, { showTenant: false, showSubdomain });
        const dataIndexByKey: Partial<Record<UserTableColumnKey, string>> = {
            tenantOrgName: 'name',
            tenantId: 'id',
            maxConsultants: 'beraterCount',
        };

        const columns: Array<ColumnProps<TenantData>> = visibleColumns.map(({ key, width, sortable }) => {
            const base: ColumnProps<TenantData> = {
                key,
                dataIndex: dataIndexByKey[key] ?? key,
                width,
                ellipsis: true,
                className: 'counselorList__column',
                ...(sortable && SORT_FIELD_BY_COLUMN[key]
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
                    return { ...base, title: t('tenants.list.tenantId') };
                case 'maxConsultants':
                    return { ...base, title: t('tenants.list.maxConsultants') };
                case 'subdomain':
                    return {
                        ...base,
                        title: t('tenants.list.subdomain'),
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
                        render: (_: unknown, tenant: TenantData) => (
                            <div className="tableActionWrapper userTableActions">
                                {canEditOrDelete && (
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
                        ),
                    };
                default:
                    return base;
            }
        });

        return columns;
    }, [
        showSubdomain,
        config,
        onEditTenant,
        onDeleteTenant,
        canEditOrDelete,
        mainTenantSubdomain,
        fixActionsColumn,
        t,
        sortBy,
        order,
    ]);
};

export const mapSorterToApiField = (columnKey?: string): string | undefined => {
    if (!columnKey) return undefined;
    return SORT_FIELD_BY_COLUMN[columnKey as UserTableColumnKey];
};
