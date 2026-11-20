import { Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';
import { PolicyOptionCard } from './PolicyOptionCard';
import { TRAEGER_UNAVAILABLE_ATTRIBUTE } from './traegerUnavailable';
import type { TraegerOnlySetting, TraegerOnlySettings } from './traegerFunctions';
import styles from './styles.module.scss';

type TraegerSettingCardProps = {
    field: TraegerOnlySetting;
    labelKey: string;
    descriptionKey: string;
    settings: TraegerOnlySettings;
};

/**
 * ORISO-Admin#1577: a setting TenantService stores per Träger only. The Träger switches it; a
 * Beratungsstelle sees its Träger's value read-only and says so; the platform page holds no value and
 * says where it is set. It never disappears silently.
 */
export const TraegerSettingCard = ({ field, labelKey, descriptionKey, settings }: TraegerSettingCardProps) => {
    const { t } = useTranslation();
    const label = t(labelKey);

    if (settings.source === 'none') {
        return (
            <p className={styles.cardDescriptionSecondary} data-traeger-setting={field}>
                <strong>{label}:</strong> {t('tenants.permissions.traegerSetting.perTraeger')}
            </p>
        );
    }
    if (settings.source === 'traeger' && settings.status === 'pending') {
        return <Skeleton active title={false} paragraph={{ rows: 1 }} />;
    }
    if (settings.source === 'traeger' && settings.status === 'error') {
        return (
            <p className={styles.cardDescriptionSecondary} role="status" {...{ [TRAEGER_UNAVAILABLE_ATTRIBUTE]: '' }}>
                <strong>{label}:</strong> {t('tenants.permissions.card.notifications.traegerUnavailable')}
            </p>
        );
    }

    const readOnly = settings.source === 'traeger' || !settings.onChange;
    return (
        <PolicyOptionCard
            featureKey={field}
            label={label}
            level={settings.source === 'traeger' ? 'agency' : 'tenant'}
            withoutRule
            policy={{ value: settings.values?.[field] === true, mode: 'SUGGESTED', inherited: readOnly }}
            pending={settings.pendingFields?.has(field) === true}
            disabled={readOnly}
            supportingText={
                settings.source === 'traeger'
                    ? `${t('tenants.permissions.traegerSetting.fromTraeger')} ${t(descriptionKey)}`
                    : t(descriptionKey)
            }
            onChange={(next) => settings.onChange?.(field, next.value)}
        />
    );
};
