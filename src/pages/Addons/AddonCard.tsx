import { Card, Collapse, Switch, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import type { AdminAddon } from '../../addons/addonTypes';
import { snackbar } from '../../components/Snackbar';
import { canSwitchAddonForTenant } from '../../constants/addonsAccess';
import { AgencyOverrides } from './AgencyOverrides';
import { AddonSettingsSection } from './AddonSettingsSection';
import { AddonStatsTiles } from './AddonStatsTiles';
import { useSetTenantEnabled } from './useAddons';
import styles from './addons.module.scss';

interface AddonCardProps {
    addon: AdminAddon;
    tenantId: number;
    /** Shown as the card title; the id alone when the name is unknown. */
    tenantName?: string;
    isSuperAdmin: boolean;
}

/** One add-on at one Träger: the Träger switch, statistics, agency overrides and settings. */
export const AddonCard = ({ addon, tenantId, tenantName, isSuperAdmin }: AddonCardProps) => {
    const { t } = useTranslation();
    const { manifest } = addon;
    const canSwitch = canSwitchAddonForTenant({ isSuperAdmin });
    const setEnabled = useSetTenantEnabled(manifest.name, tenantId);
    const switchId = `addon-${manifest.name}-${tenantId}-enabled`;
    const hasStats = (manifest.stats ?? []).length > 0;

    const onToggle = (enabled: boolean) =>
        setEnabled.mutate(enabled, {
            onSuccess: () => snackbar.success(String(t(enabled ? 'addons.tenant.enabled' : 'addons.tenant.disabled'))),
        });

    return (
        <Card
            className={styles.card}
            data-testid={`addon-card-${manifest.name}-${tenantId}`}
            title={
                <div className={styles.cardTitle}>
                    <span className={styles.addonName}>
                        {tenantName ? `${tenantName} (${tenantId})` : t('addons.tenant.unnamed', { id: tenantId })}
                    </span>
                    <Tag color={addon.enabled ? 'green' : 'default'}>
                        {t(addon.enabled ? 'addons.status.active' : 'addons.status.inactive')}
                    </Tag>
                </div>
            }
            extra={
                <div className={styles.switchRow}>
                    <label htmlFor={switchId}>{t('addons.tenant.switchLabel')}</label>
                    <Switch
                        id={switchId}
                        checked={addon.enabled}
                        disabled={!canSwitch}
                        loading={setEnabled.isPending}
                        onChange={onToggle}
                        aria-describedby={canSwitch ? undefined : `${switchId}-hint`}
                    />
                </div>
            }
        >
            {!canSwitch && (
                <p id={`${switchId}-hint`} className={styles.hint}>
                    {t('addons.tenant.readOnly')}
                </p>
            )}
            {hasStats && (
                <AddonStatsTiles name={manifest.name} tenantId={tenantId} definitions={manifest.stats ?? []} />
            )}
            <Collapse
                className={styles.sections}
                defaultActiveKey={['agencies', 'settings']}
                items={[
                    {
                        key: 'agencies',
                        label: t('addons.agencies.title'),
                        children: <AgencyOverrides addon={addon} tenantId={tenantId} />,
                    },
                    {
                        key: 'settings',
                        label: t('addons.settings.title'),
                        children: <AddonSettingsSection name={manifest.name} tenantId={tenantId} />,
                    },
                ]}
            />
        </Card>
    );
};

export default AddonCard;
