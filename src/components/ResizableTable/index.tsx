import { Table as AntTable } from 'antd';
import { ColumnProps, TableProps } from 'antd/lib/table';
import classNames from 'classnames';
import { useCallback, useState } from 'react';
import type { CSSProperties } from 'react';
import ResizableTitle from './Resizable/Resizable';
import styles from './styles.module.scss';

export interface ResizeTableProps<T> extends TableProps<T> {
    columns: Array<ColumnProps<T>>;
}

const normalizeLoading = (loading: ResizeTableProps<unknown>['loading']) => {
    if (loading === true) {
        return { spinning: true, delay: 300 };
    }
    if (loading === false || loading == null) {
        return false;
    }
    return loading;
};

const DEFAULT_TABLE_SCROLL_Y = 'calc(100dvh - 280px)';

export const ResizeTable = ({
    className,
    columns,
    loading,
    scroll,
    style,
    ...defaultOptions
}: ResizeTableProps<any>) => {
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
    const effectiveScroll = { x: 'max-content', y: DEFAULT_TABLE_SCROLL_Y, ...scroll };
    const effectiveScrollY = effectiveScroll.y;
    const tableStyle = {
        ...(typeof effectiveScrollY === 'string' && effectiveScrollY !== 'auto'
            ? { '--admin-table-scroll-y': effectiveScrollY }
            : {}),
        ...style,
    } as CSSProperties;

    return (
        <AntTable
            {...defaultOptions}
            loading={normalizeLoading(loading)}
            className={classNames(styles.table, { [styles.autoHeight]: effectiveScrollY === 'auto' }, className)}
            columns={mergeColumns}
            scroll={effectiveScroll}
            style={tableStyle}
            components={{
                header: {
                    cell: ResizableTitle,
                },
            }}
        />
    );
};
