import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CollapsibleTile } from '../../../../CollapsibleTile';
import { M3Button } from '../../../../M3Button';
import { TileHelpButton } from '../../../../TileHelp';
import { PermissionPolicyControl } from '../../../../PermissionPolicyControl/PermissionPolicyControl';
import { TEAM_CHAT_AFTER_ACCEPT_PRIVACY_CONFIRM, usePrivacyConfirm } from '../../../../SupervisionPrivacyConfirm';
import { runtimeConfig } from '../../../../../config/runtimeConfig';
import type { PolicyValue } from '../../../../../types/permissionPolicy';
import { TEAM_FUNCTIONS } from '../../../../TeamFunctions';
import { APP_ONLY_HINT_KEY } from '../chatTypeCards';
import { TEAM_CHAT_HELP } from '../help';
import { ChatFeaturesDialog, type ChatFeature } from '../ChatFeaturesDialog';
import type { EffectivePolicy } from '../permissionsSettingsUtils';
import { TEAM_CHAT_AFTER_ACCEPT, TEAM_CHAT_FEATURES, TEAM_CHAT_MASTER } from '../traegerFunctions';
import permissionStyles from '../styles.module.scss';
import styles from '../SupervisionTile/styles.module.scss';

type TeamChatTileProps = {
    level: 'platform' | 'tenant' | 'agency';
    policyOf: (field: string) => EffectivePolicy;
    pending: (field: string) => boolean;
    /** One call per save: the master alone, or every setting changed in the dialog together. */
    onChange: (changes: Record<string, PolicyValue<boolean>>) => void;
};

const unavailable = (feature: ChatFeature) =>
    feature.requiresCapability === 'mediaAiScan' && !runtimeConfig.mediaAiScanAvailable;

/**
 * ORISO-Frontend#2491 (Frank, 2026-11-24): the Team-Chat tile follows the supervision tile exactly
 * (`SupervisionTile`): icon, title and a status chip; only the master switch in the tile; "Konfigurieren"
 * opens the same dialog. In the dialog: "läuft nach der Annahme weiter" (with its data-protection question,
 * default off) and what the side chat offers, each with its own "Anpassbar"/"Vorgabe".
 */
export const TeamChatTile = ({ level, policyOf, pending, onChange }: TeamChatTileProps) => {
    const { t } = useTranslation();
    // Each "Konfigurieren" starts a new dialog from the saved values, also if the last one is still closing.
    const [dialogRun, setDialogRun] = useState(0);
    const [configuring, setConfiguring] = useState(false);
    // The shared name of the team function, never typed again (teamFunctions.names.test.ts).
    const title = t(TEAM_FUNCTIONS.chat.nameKey);
    const name = { name: title };
    const confirmAfterAccept = usePrivacyConfirm({ ...TEAM_CHAT_AFTER_ACCEPT_PRIVACY_CONFIRM, options: name });
    const master = policyOf(TEAM_CHAT_MASTER);
    const afterAccept = policyOf(TEAM_CHAT_AFTER_ACCEPT);
    const status = master.value
        ? t('tenants.permissions.teamChat.summary.on', {
              afterAccept: t(
                  afterAccept.value
                      ? 'tenants.permissions.teamChat.summary.afterAcceptOn'
                      : 'tenants.permissions.teamChat.summary.afterAcceptOff',
              ),
          })
        : t('tenants.permissions.card.summary.off');

    const dialogFeatures: ChatFeature[] = [
        {
            labelKey: 'tenants.permissions.teamChat.afterAccept.label',
            descriptionKey: 'tenants.permissions.teamChat.afterAccept.description',
            field: TEAM_CHAT_AFTER_ACCEPT,
            textOptions: name,
        },
        ...TEAM_CHAT_FEATURES,
    ];

    return (
        <div
            className={permissionStyles.chatTypeTile}
            data-testid="team-chat-tile"
            data-search-tile="teamFunctions.chat.name"
        >
            <CollapsibleTile icon={<ForumOutlinedIcon />} title={title} status={status} defaultOpen>
                <div className={permissionStyles.tileIntro}>
                    <div className={permissionStyles.masterRow}>
                        <PermissionPolicyControl
                            featureKey={TEAM_CHAT_MASTER}
                            label={t('tenants.permissions.card.activated')}
                            level={level}
                            policy={master}
                            pending={pending(TEAM_CHAT_MASTER)}
                            onChange={(next) => onChange({ [TEAM_CHAT_MASTER]: next })}
                        />
                    </div>
                    <TileHelpButton topic={TEAM_CHAT_HELP} tileTitle={title} tileIcon={<ForumOutlinedIcon />} />
                </div>
                <p className={styles.description}>{t('tenants.permissions.teamChat.description', name)}</p>
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
            </CollapsibleTile>
            {configuring && (
                // The dialog's changes are saved as one request where the page can (#1560), as for supervision.
                <ChatFeaturesDialog
                    key={dialogRun}
                    titleKey="tenants.permissions.teamChat.configureDialogTitle"
                    textOptions={name}
                    descriptionKey="tenants.permissions.teamChat.configureDialogDescription"
                    saveKey="tenants.permissions.teamChat.save"
                    cancelKey="tenants.permissions.teamChat.cancel"
                    icon={<ForumOutlinedIcon />}
                    testId="team-chat-dialog"
                    features={dialogFeatures}
                    level={level}
                    policyOf={policyOf}
                    pending={pending}
                    unavailableReason={(feature) =>
                        unavailable(feature) ? t('tenants.permissions.feature.notYetAvailable') : null
                    }
                    confirmEnable={{ [TEAM_CHAT_AFTER_ACCEPT]: confirmAfterAccept.confirmEnable }}
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
            {confirmAfterAccept.dialog}
        </div>
    );
};
