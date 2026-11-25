import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import SupervisorAccountOutlinedIcon from '@mui/icons-material/SupervisorAccountOutlined';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { M3Button } from '../../../../M3Button';
import { TileSections } from '../../../../TileSections';
import { PermissionPolicyControl } from '../../../../PermissionPolicyControl/PermissionPolicyControl';
import { useSupervisionPrivacyConfirm } from '../../../../SupervisionPrivacyConfirm';
import { runtimeConfig } from '../../../../../config/runtimeConfig';
import type { PolicyValue } from '../../../../../types/permissionPolicy';
import { APP_ONLY_HINT_KEY } from '../chatTypeCards';
import { SUPERVISION_HELP } from '../help';
import { ChatFeaturesDialog, type ChatFeature } from '../ChatFeaturesDialog';
import type { EffectivePolicy } from '../permissionsSettingsUtils';
import { SectionHelp } from '../SectionHelp';
import { SUPERVISION_FEATURES, SUPERVISION_MASTER } from '../traegerFunctions';
import permissionStyles from '../styles.module.scss';
import styles from './styles.module.scss';

export type SupervisionSectionProps = {
    level: 'platform' | 'tenant' | 'agency';
    policyOf: (field: string) => EffectivePolicy;
    pending: (field: string) => boolean;
    /** One call per save: the master alone, or every feature changed in the dialog together. */
    onChange: (changes: Record<string, PolicyValue<boolean>>) => void;
};

const unavailable = (feature: ChatFeature) =>
    feature.requiresCapability === 'mediaAiScan' && !runtimeConfig.mediaAiScanAvailable;

/** What the folded Mail-Beratung tile says about supervision, next to its case sharing. */
export const supervisionSummaryKey = (masterOn: boolean) =>
    masterOn ? 'tenants.permissions.supervision.summary.on' : 'tenants.permissions.supervision.summary.off';

/**
 * Supervision as a folding section of the Mail-Beratung tile, on every level (Frank, 2026-11-25,
 * ORISO-Admin#1577 decision update): built like the case-sharing section next to it. The section
 * switches supervision on; what the supervision chat itself offers opens in a dialog, where each
 * feature keeps its own "Anpassbar"/"Vorgabe". Changes in the dialog apply only on "Speichern".
 * There is no separate Supervision tile; Live Chat keeps only its own per-type supervision switch.
 */
export const SupervisionSection = ({ level, policyOf, pending, onChange }: SupervisionSectionProps) => {
    const { t } = useTranslation();
    // Each "Konfigurieren" starts a new dialog from the saved values, also if the last one is still closing.
    const [dialogRun, setDialogRun] = useState(0);
    const [configuring, setConfiguring] = useState(false);
    const confirmSupervision = useSupervisionPrivacyConfirm();
    const master = policyOf(SUPERVISION_MASTER);

    const changeMaster = (next: PolicyValue<boolean>) => {
        // OBP 2.1 #107: a supervisor reads along, so switching it on asks about the privacy policy first.
        if (next.value && !master.value)
            confirmSupervision.confirmEnable(() => onChange({ [SUPERVISION_MASTER]: next }));
        else onChange({ [SUPERVISION_MASTER]: next });
    };

    return (
        <TileSections.Section
            wide
            id="oneOnOne-supervision"
            title={t('tenants.permissions.supervision.title')}
            note={t('tenants.permissions.supervision.description')}
            titleAction={<SectionHelp topic={SUPERVISION_HELP} />}
            collapsible
            // Folded at first, like the case-sharing section (ORISO-Frontend#2494, Frank, 2026-11-24).
            defaultOpen={false}
            searchTile="tenants.permissions.supervision.title"
        >
            <div data-testid="supervision-section">
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
                <div className={`${styles.actions} ${styles.sectionActions}`}>
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
        </TileSections.Section>
    );
};
