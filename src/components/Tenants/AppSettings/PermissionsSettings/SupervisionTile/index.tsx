import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import SupervisorAccountOutlinedIcon from '@mui/icons-material/SupervisorAccountOutlined';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CollapsibleTile } from '../../../../CollapsibleTile';
import { M3Button } from '../../../../M3Button';
import { Modal } from '../../../../Modal';
import { TileHelpButton } from '../../../../TileHelp';
import { PermissionPolicyControl } from '../../../../PermissionPolicyControl/PermissionPolicyControl';
import { useSupervisionPrivacyConfirm } from '../../../../SupervisionPrivacyConfirm';
import { runtimeConfig } from '../../../../../config/runtimeConfig';
import type { PolicyValue } from '../../../../../types/permissionPolicy';
import { APP_ONLY_HINT_KEY } from '../chatTypeCards';
import { SUPERVISION_HELP } from '../help';
import { OPTION_ICONS } from '../optionIcons';
import { PolicyOptionCard } from '../PolicyOptionCard';
import type { EffectivePolicy } from '../permissionsSettingsUtils';
import { SUPERVISION_FEATURES, SUPERVISION_MASTER } from '../traegerFunctions';
import permissionStyles from '../styles.module.scss';
import styles from './styles.module.scss';

type SupervisionTileProps = {
    level: 'platform' | 'tenant' | 'agency';
    policyOf: (field: string) => EffectivePolicy;
    pending: (field: string) => boolean;
    onChange: (field: string, next: PolicyValue<boolean>) => void;
};

const LOCKED_OFF: EffectivePolicy = { value: false, mode: 'ENFORCED', inherited: true };

const unavailable = (feature: (typeof SUPERVISION_FEATURES)[number]) =>
    feature.requiresCapability === 'mediaAiScan' && !runtimeConfig.mediaAiScanAvailable;

/**
 * ORISO-Admin#1577: supervision chats as a tile of Funktionszugriff, after the conversation types.
 * The tile switches supervision on; what the supervision chat itself offers opens in a dialog, where
 * each feature keeps its own "Anpassbar"/"Vorgabe". Changes in the dialog apply only on "Speichern".
 */
export const SupervisionTile = ({ level, policyOf, pending, onChange }: SupervisionTileProps) => {
    const { t } = useTranslation();
    const [drafts, setDrafts] = useState<Record<string, PolicyValue<boolean>> | null>(null);
    const confirmSupervision = useSupervisionPrivacyConfirm();
    const title = t('tenants.permissions.supervision.title');
    const master = policyOf(SUPERVISION_MASTER);
    const available = SUPERVISION_FEATURES.filter((feature) => !unavailable(feature));
    const featurePolicy = (feature: (typeof SUPERVISION_FEATURES)[number]) =>
        unavailable(feature) ? LOCKED_OFF : drafts?.[feature.field] ?? policyOf(feature.field);
    const onCount = available.filter((feature) => policyOf(feature.field).value).length;
    const status = master.value
        ? t('tenants.permissions.card.summary.on', { count: onCount, total: available.length })
        : t('tenants.permissions.card.summary.off');

    const changeMaster = (next: PolicyValue<boolean>) => {
        // OBP 2.1 #107: a supervisor reads along, so switching it on asks about the privacy policy first.
        if (next.value && !master.value) confirmSupervision.confirmEnable(() => onChange(SUPERVISION_MASTER, next));
        else onChange(SUPERVISION_MASTER, next);
    };

    const save = () => {
        Object.entries(drafts ?? {}).forEach(([field, next]) => {
            const current = policyOf(field);
            if (current.value !== next.value || current.mode !== next.mode) onChange(field, next);
        });
        setDrafts(null);
    };

    return (
        <div
            className={permissionStyles.chatTypeTile}
            data-testid="supervision-tile"
            data-search-tile="tenants.permissions.supervision.title"
        >
            <CollapsibleTile icon={<SupervisorAccountOutlinedIcon />} title={title} status={status} defaultOpen>
                <div className={permissionStyles.tileIntro}>
                    <div className={permissionStyles.masterRow}>
                        <PermissionPolicyControl
                            featureKey={SUPERVISION_MASTER}
                            label={t('tenants.permissions.card.activated')}
                            level={level}
                            policy={master}
                            pending={pending(SUPERVISION_MASTER)}
                            onChange={changeMaster}
                        />
                    </div>
                    <TileHelpButton
                        topic={SUPERVISION_HELP}
                        tileTitle={title}
                        tileIcon={<SupervisorAccountOutlinedIcon />}
                    />
                </div>
                <p className={styles.description}>{t('tenants.permissions.supervision.description')}</p>
                <div className={styles.actions}>
                    <M3Button
                        variant="outlined"
                        icon={<SettingsOutlinedIcon />}
                        disabled={!master.value}
                        onClick={() => setDrafts({})}
                    >
                        {t('tenants.permissions.supervision.configure')}
                    </M3Button>
                    {!master.value && (
                        <span className={permissionStyles.cardDescriptionSecondary}>
                            {t('tenants.permissions.supervision.configureNeedsMaster')}
                        </span>
                    )}
                </div>
                {confirmSupervision.dialog}
            </CollapsibleTile>
            {drafts && (
                <Modal
                    title={t('tenants.permissions.supervision.dialogTitle')}
                    description={t('tenants.permissions.supervision.dialogDescription')}
                    icon={<SupervisorAccountOutlinedIcon />}
                    okLabelKey="tenants.permissions.supervision.save"
                    cancelLabelKey="tenants.permissions.supervision.cancel"
                    onConfirm={save}
                    onClose={() => setDrafts(null)}
                    width={880}
                    scrollableBody
                    descriptionFullWidth
                    wrapperTestId="supervision-dialog"
                >
                    <div className={permissionStyles.togglesList}>
                        {SUPERVISION_FEATURES.map((feature) => (
                            <PolicyOptionCard
                                key={feature.field}
                                Icon={OPTION_ICONS[feature.labelKey]}
                                featureKey={feature.field}
                                label={t(feature.labelKey)}
                                level={level}
                                policy={featurePolicy(feature)}
                                pending={pending(feature.field)}
                                disabled={unavailable(feature)}
                                supportingText={
                                    unavailable(feature)
                                        ? t('tenants.permissions.feature.notYetAvailable')
                                        : t(
                                              `tenants.permissions.featureDescription.${feature.labelKey
                                                  .split('.')
                                                  .at(-1)}`,
                                          )
                                }
                                onChange={(next) =>
                                    setDrafts((current) => ({
                                        ...current,
                                        [feature.field]: { ...next, inherited: false },
                                    }))
                                }
                            />
                        ))}
                    </div>
                    <p className={permissionStyles.cardDescriptionSecondary}>{t(APP_ONLY_HINT_KEY)}</p>
                    {!runtimeConfig.mediaAiScanAvailable && (
                        <p className={permissionStyles.cardDescriptionSecondary}>
                            {t('tenants.permissions.feature.mediaAiScanUnavailable')}
                        </p>
                    )}
                </Modal>
            )}
        </div>
    );
};
