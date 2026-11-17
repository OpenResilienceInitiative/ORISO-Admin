import { Card, Popconfirm, Switch, Tag } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../../addons/intlLocale';
import { localizedText, type AdminAddon } from '../../addons/addonTypes';
import { snackbar } from '../../components/Snackbar';
import { AddonReadme } from './AddonReadme';
import { useSetGlobalEnabled } from './useAddons';
import styles from './addons.module.scss';

interface AddonInfoProps {
    addon: AdminAddon;
}

/**
 * What an add-on is, for the platform admin: readme, version, apps and the platform-wide switch.
 * Render it keyed by add-on name so a pending confirmation never applies to another add-on.
 */
export const AddonInfo = ({ addon }: AddonInfoProps) => {
    const { t, i18n } = useTranslation();
    const language = i18n.resolvedLanguage || i18n.language || 'de';
    const { manifest, discoveredAt } = addon;
    const apps = manifest.apps ?? [];
    const globallyEnabled = !!addon.global?.enabled;
    const setGlobal = useSetGlobalEnabled(manifest.name);
    const [confirmOff, setConfirmOff] = useState(false);
    const switchId = `addon-${manifest.name}-global`;

    const apply = (enabled: boolean) =>
        setGlobal.mutate(enabled, {
            onSuccess: () => snackbar.success(String(t(enabled ? 'addons.global.enabled' : 'addons.global.disabled'))),
            onError: () => snackbar.error(String(t('addons.tenants.switchError'))),
        });

    return (
        <Card
            className={styles.card}
            data-testid={`addon-info-${manifest.name}`}
            title={
                <div className={styles.cardTitle}>
                    <span className={styles.addonName}>{manifest.name}</span>
                    <Tag>{t('addons.version', { version: manifest.version })}</Tag>
                    {manifest.contract && <Tag>{manifest.contract}</Tag>}
                </div>
            }
            extra={
                <div className={styles.switchRow}>
                    <label htmlFor={switchId}>{t('addons.global.switchLabel')}</label>
                    <Popconfirm
                        open={confirmOff}
                        title={t('addons.global.confirmOff')}
                        okText={t('addons.global.confirmOffOk')}
                        cancelText={t('btn.cancel')}
                        onConfirm={() => {
                            setConfirmOff(false);
                            apply(false);
                        }}
                        onCancel={() => setConfirmOff(false)}
                    >
                        <Switch
                            id={switchId}
                            checked={globallyEnabled}
                            loading={setGlobal.isPending}
                            onChange={(enabled) => (enabled ? apply(true) : setConfirmOff(true))}
                        />
                    </Popconfirm>
                </div>
            }
        >
            <AddonReadme name={manifest.name} hasReadme={addon.hasReadme} />
            {apps.length > 0 && (
                <div className={styles.apps}>
                    <span className={styles.label}>{t('addons.apps')}</span>
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
                </div>
            )}
            {discoveredAt && (
                <p className={styles.hint}>
                    {t('addons.discoveredAt', { date: formatDateTime(discoveredAt, language) })}
                </p>
            )}
        </Card>
    );
};

export default AddonInfo;
