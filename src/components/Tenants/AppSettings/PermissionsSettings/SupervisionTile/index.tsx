import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import SupervisorAccountOutlinedIcon from '@mui/icons-material/SupervisorAccountOutlined';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CollapsibleTile } from '../../../../CollapsibleTile';
import { M3Button } from '../../../../M3Button';
import { TileHelpButton } from '../../../../TileHelp';
import { PermissionPolicyControl } from '../../../../PermissionPolicyControl/PermissionPolicyControl';
import { useSupervisionPrivacyConfirm } from '../../../../SupervisionPrivacyConfirm';
import { runtimeConfig } from '../../../../../config/runtimeConfig';
import type { PolicyValue } from '../../../../../types/permissionPolicy';
import { APP_ONLY_HINT_KEY } from '../chatTypeCards';
import { SUPERVISION_HELP } from '../help';
import { ChatFeaturesDialog, type ChatFeature } from '../ChatFeaturesDialog';
import type { EffectivePolicy } from '../permissionsSettingsUtils';
import { SUPERVISION_FEATURES, SUPERVISION_MASTER } from '../traegerFunctions';
import permissionStyles from '../styles.module.scss';
import styles from './styles.module.scss';

type SupervisionTileProps = {
    level: 'platform' | 'tenant' | 'agency';
    policyOf: (field: string) => EffectivePolicy;
    pending: (field: string) => boolean;
    /** One call per save: the master alone, or every feature changed in the dialog together. */
    onChange: (changes: Record<string, PolicyValue<boolean>>) => void;
};

const unavailable = (feature: ChatFeature) =>
    feature.requiresCapability === 'mediaAiScan' && !runtimeConfig.mediaAiScanAvailable;

/**
 * ORISO-Admin#1577: supervision chats as a tile of Funktionszugriff, after the conversation types.
 * The tile switches supervision on; what the supervision chat itself offers opens in a dialog, where
 * each feature keeps its own "Anpassbar"/"Vorgabe". Changes in the dialog apply only on "Speichern".
 */
export const SupervisionTile = ({ level, policyOf, pending, onChange }: SupervisionTileProps) => {
    const { t } = useTranslation();
    // Each "Konfigurieren" starts a new dialog from the saved values, also if the last one is still closing.
    const [dialogRun, setDialogRun] = useState(0);
    const [configuring, setConfiguring] = useState(false);
    const confirmSupervision = useSupervisionPrivacyConfirm();
    const title = t('tenants.permissions.supervision.title');
    const master = policyOf(SUPERVISION_MASTER);
    const available = SUPERVISION_FEATURES.filter((feature) => !unavailable(feature));
    const onCount = available.filter((feature) => policyOf(feature.field).value).length;
    const status = master.value
        ? t('tenants.permissions.card.summary.on', { count: onCount, total: available.length })
        : t('tenants.permissions.card.summary.off');

    const changeMaster = (next: PolicyValue<boolean>) => {
        // OBP 2.1 #107: a supervisor reads along, so switching it on asks about the privacy policy first.
        if (next.value && !master.value)
            confirmSupervision.confirmEnable(() => onChange({ [SUPERVISION_MASTER]: next }));
        else onChange({ [SUPERVISION_MASTER]: next });
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
                        onClick={() => {
                            setDialogRun((run) => run + 1);
                            setConfiguring(true);
                        }}
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
            {configuring && (
                // The dialog's changes are saved as one request where the page can (#1560).
                <ChatFeaturesDialog
                    key={dialogRun}
                    titleKey="tenants.permissions.supervision.dialogTitle"
                    descriptionKey="tenants.permissions.supervision.dialogDescription"
                    saveKey="tenants.permissions.supervision.save"
                    cancelKey="tenants.permissions.supervision.cancel"
                    icon={<SupervisorAccountOutlinedIcon />}
                    testId="supervision-dialog"
                    features={SUPERVISION_FEATURES}
                    level={level}
                    policyOf={policyOf}
                    pending={pending}
                    unavailableReason={(feature) =>
                        unavailable(feature) ? t('tenants.permissions.feature.notYetAvailable') : null
                    }
                    notes={
                        <>
                            <p className={permissionStyles.cardDescriptionSecondary}>{t(APP_ONLY_HINT_KEY)}</p>
                            {!runtimeConfig.mediaAiScanAvailable && (
                                <p className={permissionStyles.cardDescriptionSecondary}>
                                    {t('tenants.permissions.feature.mediaAiScanUnavailable')}
                                </p>
                            )}
                        </>
                    }
                    onSave={onChange}
                    onClose={() => setConfiguring(false)}
                />
            )}
        </div>
    );
};
