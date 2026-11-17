import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { localizedText, type AdminAddon } from '../../addons/addonTypes';
import { SegmentedTabs, type SegmentedTab } from '../../components/SegmentedTabs';
import type { AdminPageEntry } from './AddonsLayout';
import { AddonSettingsSection } from './AddonSettingsSection';
import { AddonStatsTiles } from './AddonStatsTiles';
import { AgencyOverrides } from './AgencyOverrides';
import styles from './addons.module.scss';

interface AddonDetailsProps {
    addon: AdminAddon;
    tenantId: number;
    adminPages: AdminPageEntry[];
}

type DetailKey = 'agencies' | 'settings' | 'stats' | 'apps';

/** The parts of one add-on at one Träger, one tab at a time. */
export const AddonDetails = ({ addon, tenantId, adminPages }: AddonDetailsProps) => {
    const { t, i18n } = useTranslation();
    const language = i18n.resolvedLanguage || i18n.language || 'de';
    const { manifest } = addon;
    const stats = manifest.stats ?? [];
    const pages = adminPages.filter((entry) => entry.addon.name === manifest.name);
    const agenciesApply = addon.mode !== 'OFF' && addon.mode !== 'ON_HIDDEN';

    const tabs: Array<SegmentedTab & { key: DetailKey }> = [
        ...(agenciesApply ? [{ key: 'agencies' as const, label: t('addons.agencies.title') }] : []),
        { key: 'settings', label: t('addons.settings.title') },
        ...(stats.length > 0 ? [{ key: 'stats' as const, label: t('addons.stats.title') }] : []),
        ...(pages.length > 0 ? [{ key: 'apps' as const, label: t('addons.apps') }] : []),
    ];
    const [active, setActive] = useState<DetailKey>(tabs[0].key);
    const current = tabs.find((tab) => tab.key === active) ?? tabs[0];

    const renderPanel = () => {
        switch (current.key) {
            case 'agencies':
                return <AgencyOverrides addon={addon} tenantId={tenantId} />;
            case 'stats':
                return <AddonStatsTiles name={manifest.name} tenantId={tenantId} definitions={stats} />;
            case 'apps':
                return (
                    <ul className={styles.appList}>
                        {pages.map((entry) => (
                            <li key={entry.to}>
                                <Link to={entry.to}>{localizedText(entry.app.title, language, entry.app.id)}</Link>
                            </li>
                        ))}
                    </ul>
                );
            default:
                return <AddonSettingsSection name={manifest.name} tenantId={tenantId} />;
        }
    };

    return (
        <div className={styles.details}>
            <SegmentedTabs
                ariaLabel={String(t('addons.details.label', { addon: manifest.name }))}
                tabs={tabs}
                activeKey={current.key}
                onChange={(key) => setActive(key as DetailKey)}
            />
            <div role="tabpanel" aria-label={String(current.label)} className={styles.detailsPanel}>
                {renderPanel()}
            </div>
        </div>
    );
};

export default AddonDetails;
