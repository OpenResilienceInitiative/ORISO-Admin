import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { M3Button } from '../../../../M3Button';
import { PermissionPolicyControl } from '../../../../PermissionPolicyControl/PermissionPolicyControl';
import { runtimeConfig } from '../../../../../config/runtimeConfig';
import type { PolicyValue } from '../../../../../types/permissionPolicy';
import { TEAM_FUNCTIONS } from '../../../../TeamFunctions';
import { APP_ONLY_HINT_KEY } from '../chatTypeCards';
import { ChatFeaturesDialog, type ChatFeature } from '../ChatFeaturesDialog';
import type { EffectivePolicy } from '../permissionsSettingsUtils';
import { TEAM_CHAT_FEATURES, TEAM_CHAT_MASTER } from '../traegerFunctions';
import permissionStyles from '../styles.module.scss';
import styles from './styles.module.scss';

type TeamChatSectionProps = {
    level: 'platform' | 'tenant' | 'agency';
    policyOf: (field: string) => EffectivePolicy;
    pending: (field: string) => boolean;
    /** One call per save: the master alone, or every feature changed in the dialog together. */
    onChange: (changes: Record<string, PolicyValue<boolean>>) => void;
};

const unavailable = (feature: ChatFeature) =>
    feature.requiresCapability === 'mediaAiScan' && !runtimeConfig.mediaAiScanAvailable;

/**
 * The Team-Chat on the Mail Beratung tile: the counsellors' side chat on an open enquiry (not team
 * counselling, which is a case-sharing mode).
 *
 * ORISO-Frontend#2491 (Frank, 2026-11-23): controlled exactly like supervision (`SupervisionTile`). The
 * master is a permission policy on all three levels — preset or requirement on the platform, own value or
 * requirement on the Träger, own value on the Beratungsstelle unless required from above — and
 * "Konfigurieren" opens what the side chat offers, each feature with its own "Anpassbar"/"Vorgabe".
 */
export const TeamChatSection = ({ level, policyOf, pending, onChange }: TeamChatSectionProps) => {
    const { t } = useTranslation();
    // Each "Konfigurieren" starts a new dialog from the saved values, also if the last one is still closing.
    const [dialogRun, setDialogRun] = useState(0);
    const [configuring, setConfiguring] = useState(false);
    const master = policyOf(TEAM_CHAT_MASTER);

    return (
        <>
            <div className={permissionStyles.masterRow} data-testid="team-chat-master">
                <PermissionPolicyControl
                    featureKey={TEAM_CHAT_MASTER}
                    label={t(TEAM_FUNCTIONS.chat.nameKey)}
                    supportingText={t(TEAM_FUNCTIONS.chat.descriptionKey)}
                    level={level}
                    policy={master}
                    pending={pending(TEAM_CHAT_MASTER)}
                    onChange={(next) => onChange({ [TEAM_CHAT_MASTER]: next })}
                />
            </div>
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
                    {t('tenants.permissions.teamChat.configure')}
                </M3Button>
                {!master.value && (
                    <span className={permissionStyles.cardDescriptionSecondary}>
                        {t('tenants.permissions.teamChat.configureNeedsMaster')}
                    </span>
                )}
            </div>
            {configuring && (
                // The dialog's changes are saved as one request where the page can (#1560), as for supervision.
                <ChatFeaturesDialog
                    key={dialogRun}
                    titleKey="tenants.permissions.teamChat.dialogTitle"
                    descriptionKey="tenants.permissions.teamChat.dialogDescription"
                    saveKey="tenants.permissions.teamChat.save"
                    cancelKey="tenants.permissions.teamChat.cancel"
                    icon={<ForumOutlinedIcon />}
                    testId="team-chat-dialog"
                    features={TEAM_CHAT_FEATURES}
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
        </>
    );
};
