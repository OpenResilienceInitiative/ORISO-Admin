import { Card, Collapse, Switch, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { snackbar } from '../../components/Snackbar';
import { localizedText, type AdminAddon } from '../../addons/addonTypes';
import { canSwitchAddonForTenant } from '../../constants/addonsAccess';
import { AgencyOverrides } from './AgencyOverrides';
import { AddonSettingsSection } from './AddonSettingsSection';
import { AddonStatsTiles } from './AddonStatsTiles';
import { useSetTenantEnabled } from './useAddons';
import styles from './addons.module.scss';

interface AddonCardProps {
    addon: AdminAddon;
    tenantId: number;
    isSuperAdmin: boolean;
}

export const AddonCard = ({ addon, tenantId, isSuperAdmin }: AddonCardProps) => {
    const { t, i18n } = useTranslation();
    const language = i18n.resolvedLanguage || i18n.language || 'de';
    const { manifest } = addon;
    const canSwitch = canSwitchAddonForTenant({ isSuperAdmin });
    const setEnabled = useSetTenantEnabled(manifest.name, tenantId);
    const switchId = `addon-${manifest.name}-enabled`;
    const apps = manifest.apps ?? [];
    const hasStats = (manifest.stats ?? []).length > 0;

    const onToggle = (enabled: boolean) =>
        setEnabled.mutate(enabled, {
            onSuccess: () => snackbar.success(String(t(enabled ? 'addons.tenant.enabled' : 'addons.tenant.disabled'))),
        });

    return (
        <Card
            className={styles.card}
            data-testid={`addon-card-${manifest.name}`}
            title={
                <div className={styles.cardTitle}>
                    <span className={styles.addonName}>{manifest.name}</span>
                    <Tag>{t('addons.version', { version: manifest.version })}</Tag>
                    <Tag className={addon.enabled ? styles.statusActive : undefined}>
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
            <div className={styles.apps}>
                <span className={styles.label}>{t('addons.apps')}</span>
                {apps.length === 0 ? (
                    <span>{t('addons.apps.none')}</span>
                ) : (
                    <ul className={styles.appList}>
                        {apps.map((app) => (
                            <li key={app.id}>
                                <strong>{localizedText(app.title, language, app.id)}</strong>{' '}
                                {(app.slots ?? []).map((slot) => (
                                    <Tag key={slot}>{slot}</Tag>
                                ))}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {hasStats && (
                <AddonStatsTiles name={manifest.name} tenantId={tenantId} definitions={manifest.stats ?? []} />
            )}
            <Collapse
                className={styles.sections}
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
