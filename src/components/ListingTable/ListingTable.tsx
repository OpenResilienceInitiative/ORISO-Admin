import { Table } from 'antd';
import type { TableProps } from 'antd';
import classNames from 'classnames';
import styles from './styles.module.scss';

export const ListingTable = <T extends object>({ className, ...props }: TableProps<T>) => (
    <Table {...props} className={classNames(styles.listingTable, className)} />
);

export { styles as listingTableStyles };
