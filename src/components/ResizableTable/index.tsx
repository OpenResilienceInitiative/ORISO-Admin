import { Table as AntTable } from 'antd';
import { ColumnProps, TableProps } from 'antd/lib/table';
import classNames from 'classnames';
import { useCallback, useState } from 'react';
import ResizableTitle from './Resizable/Resizable';
import styles from './styles.module.scss';

export interface ResizeTableProps<T> extends TableProps<T> {
    columns: Array<ColumnProps<T>>;
}

export const ResizeTable = ({ columns, ...defaultOptions }: ResizeTableProps<any>) => {
    const [columnsWidth, setColumnsWidth] = useState(columns.filter(Boolean).map(({ width }) => width));

    const handleResize = useCallback(
        (index) =>
            (_, { size }) => {
                const newColumnsWidth = [...columnsWidth];
                newColumnsWidth[index] = size.width;
                setColumnsWidth(newColumnsWidth);
            },
        [columnsWidth],
    );

    const mergeColumns = columns.filter(Boolean).map((col, index) => ({
        ...col,
        width: columnsWidth[index],
        onHeaderCell: (column) => ({
            width: column.width,
            onResize: handleResize(index),
        }),
    }));

    return (
        <AntTable
            {...defaultOptions}
            className={classNames(styles.table)}
            columns={mergeColumns}
            scroll={{ x: 'max-content', y: 'auto' }}
            components={{
                header: {
                    cell: ResizableTitle,
                },
            }}
        />
    );
};
