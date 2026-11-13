import { Card, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { localizedText, type AddonManifest } from '../../addons/addonTypes';
import styles from './addons.module.scss';

interface AddonInfoProps {
    manifest: AddonManifest;
    discoveredAt?: string;
}

/** What an add-on is, independent of any Träger: version, contract and its apps with their slots. */
export const AddonInfo = ({ manifest, discoveredAt }: AddonInfoProps) => {
    const { t, i18n } = useTranslation();
    const language = i18n.resolvedLanguage || i18n.language || 'de';
    const apps = manifest.apps ?? [];

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
        >
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
