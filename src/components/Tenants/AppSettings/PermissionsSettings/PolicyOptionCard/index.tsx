import type { ComponentProps, ComponentType } from 'react';
import { PermissionPolicyControl } from '../../../../PermissionPolicyControl/PermissionPolicyControl';
import styles from './styles.module.scss';

type PolicyOptionCardProps = Omit<ComponentProps<typeof PermissionPolicyControl>, 'compact'> & {
    Icon?: ComponentType<{ className?: string }>;
};

/** One setting of a tile as a small card: what it is, its status, and its switch. */
export const PolicyOptionCard = ({ Icon, ...control }: PolicyOptionCardProps) => (
    <div className={styles.card}>
        {Icon && (
            <span className={styles.icon} aria-hidden>
                <Icon className={styles.glyph} />
            </span>
        )}
        <PermissionPolicyControl {...control} compact />
    </div>
);
