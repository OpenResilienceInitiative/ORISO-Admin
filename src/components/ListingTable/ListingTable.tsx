import { Table } from 'antd';
import type { TableProps } from 'antd';
import classNames from 'classnames';
import type { CSSProperties } from 'react';
import styles from './styles.module.scss';

const DEFAULT_TABLE_SCROLL_Y = 'calc(100dvh - 280px)';

export const ListingTable = <T extends object>({ className, scroll, style, ...props }: TableProps<T>) => {
    const effectiveScroll = { x: 'max-content', y: DEFAULT_TABLE_SCROLL_Y, ...scroll };
    const effectiveScrollY = effectiveScroll.y;
    const tableStyle = {
        ...(typeof effectiveScrollY === 'string' && effectiveScrollY !== 'auto'
            ? { '--admin-table-scroll-y': effectiveScrollY }
            : {}),
        ...style,
    } as CSSProperties;

    return (
        <Table
            {...props}
            className={classNames(styles.listingTable, { [styles.autoHeight]: effectiveScrollY === 'auto' }, className)}
            scroll={effectiveScroll}
            style={tableStyle}
        />
    );
};

export { styles as listingTableStyles };
