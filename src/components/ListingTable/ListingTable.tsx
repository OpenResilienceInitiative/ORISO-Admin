import { Table } from 'antd';
import type { TableProps } from 'antd';
import classNames from 'classnames';
import { useRef, type CSSProperties } from 'react';
import styles from './styles.module.scss';
import { useAdminTableScrollY } from '../ResizableTable/useAdminTableScrollY';

const scrollYToCssValue = (scrollY: string | number): string =>
    typeof scrollY === 'number' ? `${scrollY}px` : scrollY;

const scrollYCssVar = (scrollY: string | number | undefined): CSSProperties => {
    if (scrollY === undefined || scrollY === 'auto') {
        return {};
    }
    return { '--admin-table-scroll-y': scrollYToCssValue(scrollY) };
};

export const ListingTable = <T extends object>({ className, scroll, style, ...props }: TableProps<T>) => {
    const hostRef = useRef<HTMLDivElement>(null);
    const callerScrollY = scroll?.y;
    const measureDefaultScrollY = callerScrollY === undefined;
    const measuredScrollY = useAdminTableScrollY(hostRef, measureDefaultScrollY);

    const defaultScrollY = measureDefaultScrollY ? measuredScrollY : callerScrollY;
    const effectiveScroll = { x: 'max-content', y: defaultScrollY, ...scroll };
    const effectiveScrollY = effectiveScroll.y;
    const tableStyle = {
        ...scrollYCssVar(effectiveScrollY),
        ...style,
    } as CSSProperties;

    return (
        <div ref={hostRef} className={styles.measureHost}>
            <Table
                {...props}
                className={classNames(
                    styles.listingTable,
                    { [styles.autoHeight]: effectiveScrollY === 'auto' },
                    className,
                )}
                scroll={effectiveScroll}
                style={tableStyle}
            />
        </div>
    );
};

export { styles as listingTableStyles };
