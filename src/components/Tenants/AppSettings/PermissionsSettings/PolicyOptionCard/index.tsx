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
        {/* #1558: the page explains "Anpassbar" once; a card shows the open lock only. */}
        <PermissionPolicyControl quietAdjustable {...control} compact />
    </div>
);
