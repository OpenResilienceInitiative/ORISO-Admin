import { Alert, Card, Statistic } from 'antd';
import { useTranslation } from 'react-i18next';
import { AddonsLoading } from './AddonsLoading';
import { localizedText, type AddonStatDefinition } from '../../addons/addonTypes';
import { useAddonStats } from './useAddons';
import styles from './addons.module.scss';

interface AddonStatsTilesProps {
    name: string;
    tenantId: number;
    definitions: AddonStatDefinition[];
}

export const AddonStatsTiles = ({ name, tenantId, definitions }: AddonStatsTilesProps) => {
    const { t, i18n } = useTranslation();
    const language = i18n.resolvedLanguage || i18n.language || 'de';
    const stats = useAddonStats(name, tenantId, definitions.length > 0);

    if (stats.isLoading) {
        return <AddonsLoading />;
    }
    if (stats.isError) {
        return <Alert type="warning" showIcon message={t('addons.stats.loadError')} />;
    }

    const tiles = stats.data?.stats ?? [];
    if (tiles.length === 0) {
        return null;
    }

    return (
        <section className={styles.stats} aria-label={String(t('addons.stats.title'))}>
            {tiles.map((stat) => {
                const definition = definitions.find((candidate) => candidate.id === stat.id);
                const label = localizedText(stat.label ?? definition?.label, language, stat.id);
                return (
                    <Card key={stat.id} size="small" className={styles.statTile}>
                        {stat.value === null || stat.value === undefined ? (
                            <Statistic title={label} value={String(t('addons.stats.noValue'))} />
                        ) : (
                            <Statistic title={label} value={stat.value} />
                        )}
                    </Card>
                );
            })}
        </section>
    );
};

export default AddonStatsTiles;
