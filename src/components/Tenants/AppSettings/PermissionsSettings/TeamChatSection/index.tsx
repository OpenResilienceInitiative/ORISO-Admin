import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { M3Button } from '../../../../M3Button';
import { PermissionPolicyControl } from '../../../../PermissionPolicyControl/PermissionPolicyControl';
import { TEAM_CHAT_AFTER_ACCEPT_PRIVACY_CONFIRM, usePrivacyConfirm } from '../../../../SupervisionPrivacyConfirm';
import { runtimeConfig } from '../../../../../config/runtimeConfig';
import type { PolicyValue } from '../../../../../types/permissionPolicy';
import { TEAM_FUNCTIONS } from '../../../../TeamFunctions';
import { APP_ONLY_HINT_KEY } from '../chatTypeCards';
import { ChatFeaturesDialog, type ChatFeature } from '../ChatFeaturesDialog';
import type { EffectivePolicy } from '../permissionsSettingsUtils';
import { TEAM_CHAT_AFTER_ACCEPT, TEAM_CHAT_FEATURES, TEAM_CHAT_MASTER } from '../traegerFunctions';
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
 *
 * Frank, 2026-11-23: "Team-Chat läuft nach der Annahme weiter" is a second policy with the same controls.
 * It needs the master, and switching it on first asks the same data-protection question as supervision.
 */
export const TeamChatSection = ({ level, policyOf, pending, onChange }: TeamChatSectionProps) => {
    const { t } = useTranslation();
    // Each "Konfigurieren" starts a new dialog from the saved values, also if the last one is still closing.
    const [dialogRun, setDialogRun] = useState(0);
    const [configuring, setConfiguring] = useState(false);
    const master = policyOf(TEAM_CHAT_MASTER);
    // The shared name of the team function, never typed again (teamFunctions.names.test.ts).
    const name = { name: t(TEAM_FUNCTIONS.chat.nameKey) };
    const afterAccept = policyOf(TEAM_CHAT_AFTER_ACCEPT);
    const confirmAfterAccept = usePrivacyConfirm({ ...TEAM_CHAT_AFTER_ACCEPT_PRIVACY_CONFIRM, options: name });
    let afterAcceptText = t('tenants.permissions.teamChat.afterAccept.off', name);
    if (!master.value) afterAcceptText = t('tenants.permissions.teamChat.afterAccept.needsMaster', name);
    else if (afterAccept.value) afterAcceptText = t('tenants.permissions.teamChat.afterAccept.on', name);

    const changeAfterAccept = (next: PolicyValue<boolean>) => {
        // Like supervision: widening who reads on asks about data protection first; switching off never asks.
        if (next.value && !afterAccept.value)
            confirmAfterAccept.confirmEnable(() => onChange({ [TEAM_CHAT_AFTER_ACCEPT]: next }));
        else onChange({ [TEAM_CHAT_AFTER_ACCEPT]: next });
    };

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
            <div className={permissionStyles.masterRow} data-testid="team-chat-after-accept">
                <PermissionPolicyControl
                    featureKey={TEAM_CHAT_AFTER_ACCEPT}
                    label={t('tenants.permissions.teamChat.afterAccept.label', name)}
                    supportingText={afterAcceptText}
                    level={level}
                    policy={afterAccept}
                    pending={pending(TEAM_CHAT_AFTER_ACCEPT)}
                    disabled={!master.value}
                    onChange={changeAfterAccept}
                />
            </div>
            {confirmAfterAccept.dialog}
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
