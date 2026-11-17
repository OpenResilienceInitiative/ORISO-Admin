import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { Card, Switch, Tag } from 'antd';
import classNames from 'classnames';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminAddon } from '../../addons/addonTypes';
import { snackbar } from '../../components/Snackbar';
import { AddonDetails } from './AddonDetails';
import type { AdminPageEntry } from './AddonsLayout';
import { useSetTenantEnabled } from './useAddons';
import { reportAddonSaveError } from './mutationFeedback';
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
    /** Adds the readme as the first tab. */
    showReadme?: boolean;
    /** With several add-ons the header folds the card; without it the card is always open. */
    collapse?: { expanded: boolean; onToggle: () => void };
}

/** One add-on at one Träger: its state in the header, its readme and details as tabs. */
export const AddonCard = ({
    addon,
    tenantId,
    adminPages,
    title,
    tags,
    canSwitch,
    showReadme = false,
    collapse,
}: AddonCardProps) => {
    const { t } = useTranslation();
    const { manifest } = addon;
    const setEnabled = useSetTenantEnabled(manifest.name, tenantId);
    const switchId = `addon-${manifest.name}-${tenantId}-enabled`;
    const bodyId = `addon-${manifest.name}-${tenantId}-body`;
    const expanded = collapse?.expanded ?? true;

    const onToggle = (enabled: boolean) =>
        setEnabled.mutate(enabled, {
            onSuccess: () => snackbar.success(String(t(enabled ? 'addons.tenant.enabled' : 'addons.tenant.disabled'))),
            onError: (error) => reportAddonSaveError(error, t),
        });

    const heading = (
        <>
            <span className={styles.addonName}>{title ?? manifest.name}</span>
            {tags}
            {!canSwitch && (
                <Tag className={addon.enabled ? styles.statusActive : undefined}>
                    {t(addon.enabled ? 'addons.status.active' : 'addons.status.inactive')}
                </Tag>
            )}
        </>
    );

    return (
        <Card
            className={classNames(styles.card, { [styles.cardCollapsed]: !expanded })}
            data-testid={`addon-card-${manifest.name}-${tenantId}`}
            title={
                collapse ? (
                    <button
                        type="button"
                        className={classNames(styles.cardTitle, styles.cardToggle)}
                        aria-expanded={expanded}
                        aria-controls={bodyId}
                        onClick={collapse.onToggle}
                    >
                        <KeyboardArrowDownIcon
                            aria-hidden
                            fontSize="small"
                            className={classNames(styles.chevron, { [styles.chevronOpen]: expanded })}
                        />
                        {heading}
                    </button>
                ) : (
                    <div className={styles.cardTitle}>{heading}</div>
                )
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
            <div id={bodyId} hidden={!expanded}>
                {expanded && (
                    <AddonDetails addon={addon} tenantId={tenantId} adminPages={adminPages} showReadme={showReadme} />
                )}
            </div>
        </Card>
    );
};

export default AddonCard;
