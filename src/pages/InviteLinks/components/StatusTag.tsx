import { Tag } from 'antd';
import classNames from 'classnames';
import { InviteLinkStatus } from '../types';
import styles from '../styles.module.scss';

const statusClassMap: Record<InviteLinkStatus, string> = {
    ACTIVE: styles.statusTagActive,
    USED: styles.statusTagDefault,
    EXPIRED: styles.statusTagExpired,
};

export const StatusTag = ({ status }: { status: InviteLinkStatus }) => (
    <Tag className={classNames(styles.statusTag, statusClassMap[status])}>{status}</Tag>
);

export const AnonymityTag = ({ value }: { value: string }) => (
    <Tag className={classNames(styles.statusTag, styles.statusTagActive)}>{value}</Tag>
);
