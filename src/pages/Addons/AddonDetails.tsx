import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { localizedText, type AdminAddon } from '../../addons/addonTypes';
import { SegmentedTabs, type SegmentedTab } from '../../components/SegmentedTabs';
import type { AdminPageEntry } from './AddonsLayout';
import { AddonReadme } from './AddonReadme';
import { AddonSettingsSection } from './AddonSettingsSection';
import { AddonStatsTiles } from './AddonStatsTiles';
import { AgencyOverrides } from './AgencyOverrides';
import styles from './addons.module.scss';

interface AddonDetailsProps {
    addon: AdminAddon;
    tenantId: number;
    adminPages: AdminPageEntry[];
    /** Starts with the add-on's readme when it has one. */
    showReadme?: boolean;
}

type DetailKey = 'readme' | 'agencies' | 'settings' | 'stats' | 'adminPages';

/** The parts of one add-on at one Träger, one tab at a time. */
export const AddonDetails = ({ addon, tenantId, adminPages, showReadme = false }: AddonDetailsProps) => {
    const { t, i18n } = useTranslation();
    const language = i18n.resolvedLanguage || i18n.language || 'de';
    const { manifest } = addon;
    const stats = manifest.stats ?? [];
    const pages = adminPages.filter((entry) => entry.addon.name === manifest.name);
    const agenciesApply = addon.mode !== 'OFF' && addon.mode !== 'ON_HIDDEN';
    const adminPagesLabel =
        pages.length === 1 ? localizedText(pages[0].app.title, language, pages[0].app.id) : t('addons.adminPages');

    const idPrefix = `addon-${manifest.name}-${tenantId}`;

    const tabs: Array<SegmentedTab & { key: DetailKey }> = [
        ...(showReadme && addon.hasReadme ? [{ key: 'readme' as const, label: t('addons.tabs.readme') }] : []),
        ...(agenciesApply ? [{ key: 'agencies' as const, label: t('addons.agencies.title') }] : []),
        { key: 'settings', label: t('addons.settings.title') },
        ...(stats.length > 0 ? [{ key: 'stats' as const, label: t('addons.stats.title') }] : []),
        ...(pages.length > 0 ? [{ key: 'adminPages' as const, label: adminPagesLabel }] : []),
    ];
    const [active, setActive] = useState<DetailKey>(tabs[0].key);
    const current = tabs.find((tab) => tab.key === active) ?? tabs[0];

    const renderPanel = () => {
        switch (current.key) {
            case 'readme':
                return <AddonReadme name={manifest.name} hasReadme={addon.hasReadme} />;
            case 'agencies':
                return <AgencyOverrides addon={addon} tenantId={tenantId} />;
            case 'stats':
                return <AddonStatsTiles name={manifest.name} tenantId={tenantId} definitions={stats} />;
            case 'adminPages':
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
                idPrefix={idPrefix}
            />
            <div
                role="tabpanel"
                id={`${idPrefix}-panel`}
                aria-labelledby={`${idPrefix}-tab-${current.key}`}
                className={styles.detailsPanel}
            >
                {renderPanel()}
            </div>
        </div>
    );
};

export default AddonDetails;
