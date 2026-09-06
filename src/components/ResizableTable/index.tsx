import { Table as AntTable } from 'antd';
import { ColumnProps, TableProps } from 'antd/lib/table';
import classNames from 'classnames';
import { useCallback, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import ResizableTitle from './Resizable/Resizable';
import styles from './styles.module.scss';
import { useAdminTableScrollY } from './useAdminTableScrollY';

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

const scrollYToCssValue = (scrollY: string | number): string =>
    typeof scrollY === 'number' ? `${scrollY}px` : scrollY;

const scrollYCssVar = (scrollY: string | number | undefined): CSSProperties => {
    if (scrollY === undefined || scrollY === 'auto') {
        return {};
    }
    return { '--admin-table-scroll-y': scrollYToCssValue(scrollY) } as CSSProperties;
};

export const ResizeTable = ({
    className,
    columns,
    loading,
    scroll,
    style,
    ...defaultOptions
}: ResizeTableProps<any>) => {
    const hostRef = useRef<HTMLDivElement>(null);
    const [columnsWidth, setColumnsWidth] = useState(columns.filter(Boolean).map(({ width }) => width));

    const callerScrollY = scroll?.y;
    const measureDefaultScrollY = callerScrollY === undefined;
    const measuredScrollY = useAdminTableScrollY(hostRef, measureDefaultScrollY);

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

    const defaultScrollY = measureDefaultScrollY ? measuredScrollY : callerScrollY;
    const effectiveScroll = { x: 'max-content', y: defaultScrollY, ...scroll };
    const effectiveScrollY = effectiveScroll.y;
    const tableStyle = {
        ...scrollYCssVar(effectiveScrollY),
        ...style,
    } as CSSProperties;

    return (
        <div ref={hostRef} className={styles.measureHost}>
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
        </div>
    );
};
