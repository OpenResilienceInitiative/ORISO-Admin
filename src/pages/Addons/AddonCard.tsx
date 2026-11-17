import { Button, Card, Switch, Tag } from 'antd';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminAddon } from '../../addons/addonTypes';
import { snackbar } from '../../components/Snackbar';
import { AddonDetails } from './AddonDetails';
import { AddonReadme } from './AddonReadme';
import type { AdminPageEntry } from './AddonsLayout';
import { useSetTenantEnabled } from './useAddons';
import styles from './addons.module.scss';

interface AddonCardProps {
    addon: AdminAddon;
    tenantId: number;
    adminPages: AdminPageEntry[];
    /** Card heading; the add-on name when left out. */
    title?: ReactNode;
    /** Tags shown next to the heading in place of the switch. */
    tags?: ReactNode;
    /** Renders the Träger switch; only when the viewer may change it. */
    canSwitch: boolean;
    showReadme?: boolean;
    /** Details start open and cannot be folded away. */
    detailsAlwaysOpen?: boolean;
    defaultOpen?: boolean;
}

/** One add-on at one Träger: state, readme and its details (agencies, settings, statistics, apps). */
export const AddonCard = ({
    addon,
    tenantId,
    adminPages,
    title,
    tags,
    canSwitch,
    showReadme = false,
    detailsAlwaysOpen = false,
    defaultOpen = false,
}: AddonCardProps) => {
    const { t } = useTranslation();
    const { manifest } = addon;
    const setEnabled = useSetTenantEnabled(manifest.name, tenantId);
    const [open, setOpen] = useState(detailsAlwaysOpen || defaultOpen);
    const switchId = `addon-${manifest.name}-${tenantId}-enabled`;
    const detailsId = `addon-${manifest.name}-${tenantId}-details`;

    const onToggle = (enabled: boolean) =>
        setEnabled.mutate(enabled, {
            onSuccess: () => snackbar.success(String(t(enabled ? 'addons.tenant.enabled' : 'addons.tenant.disabled'))),
            onError: () => snackbar.error(String(t('addons.tenants.switchError'))),
        });

    return (
        <Card
            className={styles.card}
            data-testid={`addon-card-${manifest.name}-${tenantId}`}
            title={
                <div className={styles.cardTitle}>
                    <span className={styles.addonName}>{title ?? manifest.name}</span>
                    {tags}
                    {!canSwitch && (
                        <Tag className={addon.enabled ? styles.statusActive : undefined}>
                            {t(addon.enabled ? 'addons.status.active' : 'addons.status.inactive')}
                        </Tag>
                    )}
                </div>
            }
            extra={
                canSwitch && (
                    <div className={styles.switchRow}>
                        <label htmlFor={switchId}>{t('addons.status.active')}</label>
                        <Switch
                            id={switchId}
                            checked={addon.enabled}
                            loading={setEnabled.isPending}
                            onChange={onToggle}
                        />
                    </div>
                )
            }
        >
            {showReadme && <AddonReadme name={manifest.name} hasReadme={addon.hasReadme} />}
            {!detailsAlwaysOpen && (
                <Button
                    className={styles.detailsToggle}
                    aria-expanded={open}
                    aria-controls={detailsId}
                    onClick={() => setOpen((current) => !current)}
                >
                    {t(open ? 'addons.details.hide' : 'addons.details.show')}
                </Button>
            )}
            {open && (
                <div id={detailsId}>
                    <AddonDetails addon={addon} tenantId={tenantId} adminPages={adminPages} />
                </div>
            )}
        </Card>
    );
};

export default AddonCard;
