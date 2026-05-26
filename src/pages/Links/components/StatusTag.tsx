import { Tag } from 'antd';
import classNames from 'classnames';
import { LinkStatus } from '../types';
import styles from '../styles.module.scss';

const statusClassMap: Record<LinkStatus, string> = {
    ACTIVE: styles.statusTagActive,
    USED: styles.statusTagUsed,
    EXPIRED: styles.statusTagExpired,
};

const getAnonymityClass = (value: string): string => {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'full') {
        return styles.anonymityTagFull;
    }
    if (normalized === 'customize name') {
        return styles.anonymityTagCustomize;
    }
    if (normalized === 'name + email' || normalized === 'name+email') {
        return styles.anonymityTagNameEmail;
    }

    return styles.anonymityTagFull;
};

export const StatusTag = ({ status }: { status: LinkStatus }) => (
    <Tag className={classNames(styles.statusTag, statusClassMap[status])}>{status}</Tag>
);

export const AnonymityTag = ({ value }: { value: string }) => (
    <Tag className={classNames(styles.statusTag, getAnonymityClass(value))}>{value}</Tag>
);
