import { Card, Popconfirm, Switch, Tag, message } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { localizedText, type AdminAddon } from '../../addons/addonTypes';
import { useSetGlobalEnabled } from './useAddons';
import styles from './addons.module.scss';

interface AddonInfoProps {
    addon: AdminAddon;
    isSuperAdmin: boolean;
}

/**
 * What an add-on is, independent of any Träger: version, contract, its apps with their slots, and
 * the platform-wide switch (SuperAdmins switch it; switching off asks first, since it affects every Träger).
 */
export const AddonInfo = ({ addon, isSuperAdmin }: AddonInfoProps) => {
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
            onSuccess: () => message.success(String(t(enabled ? 'addons.global.enabled' : 'addons.global.disabled'))),
            onError: () => message.error(String(t('addons.tenants.switchError'))),
        });

    const onToggle = (enabled: boolean) => (enabled ? apply(true) : setConfirmOff(true));

    return (
        <Card
            className={styles.card}
            data-testid={`addon-info-${manifest.name}`}
            title={
                <div className={styles.cardTitle}>
                    <span className={styles.addonName}>{manifest.name}</span>
                    <Tag>{t('addons.version', { version: manifest.version })}</Tag>
                    {manifest.contract && <Tag>{manifest.contract}</Tag>}
                    <Tag color={globallyEnabled ? 'green' : 'default'}>
                        {t(globallyEnabled ? 'addons.global.on' : 'addons.global.off')}
                    </Tag>
                </div>
            }
            extra={
                <div className={styles.switchRow}>
                    <label htmlFor={switchId}>{t('addons.global.switchLabel')}</label>
                    {isSuperAdmin ? (
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
                                onChange={onToggle}
                            />
                        </Popconfirm>
                    ) : (
                        <Switch
                            id={switchId}
                            checked={globallyEnabled}
                            disabled
                            aria-describedby={`${switchId}-hint`}
                        />
                    )}
                </div>
            }
        >
            {!isSuperAdmin && (
                <p id={`${switchId}-hint`} className={styles.hint}>
                    {t('addons.global.readOnly')}
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
            {discoveredAt && (
                <p className={styles.hint}>
                    {t('addons.discoveredAt', { date: new Date(discoveredAt).toLocaleString(language) })}
                </p>
            )}
        </Card>
    );
};

export default AddonInfo;
