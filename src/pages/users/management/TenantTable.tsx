import { TablePaginationConfig } from 'antd/lib/table';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { ResizeTable } from '../../../components/ResizableTable';
import { TenantAdminData } from '../../../types/TenantAdminData';
import { TenantData } from '../../../types/tenant';
import { useUserTableColumns } from './useUserTableColumns';
import styles from './UserManagementTable.module.scss';

interface TenantTableProps {
    /** List shape of the search endpoint. */
    rows: TenantAdminData[];
    loading: boolean;
    pagination: TablePaginationConfig;
    onChange: (pagination: TablePaginationConfig, filters: unknown, sorter: any) => void;
    emptyTextKey?: string;
    figmaTableHeader: boolean;
    showSubdomain: boolean;
    canEditOrDelete: boolean;
    mainTenantSubdomain?: string;
    fixActionsColumn: boolean;
    sortBy?: string;
    order?: string;
    onEdit: (record: TenantData) => void;
    onDelete: (record: TenantData) => void;
}

/** The Träger tab keeps the AntD table; the person tabs use `UserDataTable`. */
export const TenantTable = ({
    rows,
    loading,
    pagination,
    onChange,
    emptyTextKey,
    figmaTableHeader,
    onEdit,
    onDelete,
    ...columnProps
}: TenantTableProps) => {
    const { t } = useTranslation();
    const columns = useUserTableColumns({ ...columnProps, onEditTenant: onEdit, onDeleteTenant: onDelete });

    return (
        <div className={classNames(styles.tableContainer, { [styles.tableContainerFigma]: figmaTableHeader })}>
            <ResizeTable
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={rows}
                pagination={pagination}
                onChange={onChange}
                locale={emptyTextKey ? { emptyText: t(emptyTextKey) } : undefined}
            />
        </div>
    );
};
