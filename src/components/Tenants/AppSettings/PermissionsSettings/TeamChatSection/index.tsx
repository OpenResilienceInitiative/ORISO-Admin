import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { M3Button } from '../../../../M3Button';
import { runtimeConfig } from '../../../../../config/runtimeConfig';
import type { PolicyValue } from '../../../../../types/permissionPolicy';
import { TEAM_FUNCTIONS } from '../../../../TeamFunctions';
import { ChatFeaturesDialog, type ChatFeature } from '../ChatFeaturesDialog';
import type { EffectivePolicy } from '../permissionsSettingsUtils';
import { TraegerSettingCard } from '../TraegerSettingCard';
import { TEAM_CHAT_FEATURES, TRAEGER_ONLY_SETTINGS, type TraegerOnlySettings } from '../traegerFunctions';
import permissionStyles from '../styles.module.scss';
import styles from './styles.module.scss';

type TeamChatSectionProps = {
    level: 'platform' | 'tenant' | 'agency';
    /** The master: stored per Träger only (switched on the Träger, read-only below, named on the platform). */
    settings: TraegerOnlySettings;
    policyOf: (field: string) => EffectivePolicy;
    pending: (field: string) => boolean;
    /** Every feature changed in the dialog, together, on "Speichern". */
    onChange: (changes: Record<string, PolicyValue<boolean>>) => void;
    /** What the dialog offers; the stored ones get a switch (tests hand in stored ones). */
    features?: readonly ChatFeature[];
};

const unavailable = (feature: ChatFeature) =>
    feature.requiresCapability === 'mediaAiScan' && !runtimeConfig.mediaAiScanAvailable;

/**
 * The Team-Chat on the Mail Beratung tile: the counsellors' side chat on an open enquiry (not team
 * counselling, which is a case-sharing mode). Frank, 2026-11-20: the same configuration as supervision, a
 * master switch plus "Konfigurieren", a dialog for what the side chat offers.
 *
 * The master stays where TenantService stores it, per Träger, so the platform names it and a
 * Beratungsstelle shows its Träger's value. The features follow the supervision cascade once they are
 * stored (platform → Träger → Beratungsstelle); until then the dialog names them without a switch.
 */
export const TeamChatSection = ({
    level,
    settings,
    policyOf,
    pending,
    onChange,
    features = TEAM_CHAT_FEATURES,
}: TeamChatSectionProps) => {
    const { t } = useTranslation();
    const [dialogRun, setDialogRun] = useState(0);
    const [configuring, setConfiguring] = useState(false);
    // The platform holds no master value; it sets what the side chat offers for every Träger.
    const masterOn = settings.source === 'none' || settings.values?.[TRAEGER_ONLY_SETTINGS.teamChat] === true;

    return (
        <>
            <div className={permissionStyles.togglesList}>
                <TraegerSettingCard
                    field={TRAEGER_ONLY_SETTINGS.teamChat}
                    labelKey={TEAM_FUNCTIONS.chat.nameKey}
                    descriptionKey={TEAM_FUNCTIONS.chat.descriptionKey}
                    settings={settings}
                />
            </div>
            <div className={styles.actions}>
                <M3Button
                    variant="outlined"
                    icon={<SettingsOutlinedIcon />}
                    disabled={!masterOn}
                    onClick={() => {
                        setDialogRun((run) => run + 1);
                        setConfiguring(true);
                    }}
                >
                    {t('tenants.permissions.teamChat.configure')}
                </M3Button>
                {!masterOn && (
                    <span className={permissionStyles.cardDescriptionSecondary}>
                        {t('tenants.permissions.teamChat.configureNeedsMaster')}
                    </span>
                )}
            </div>
            {configuring && (
                <ChatFeaturesDialog
                    key={dialogRun}
                    titleKey="tenants.permissions.teamChat.dialogTitle"
                    descriptionKey="tenants.permissions.teamChat.dialogDescription"
                    saveKey="tenants.permissions.teamChat.save"
                    cancelKey="tenants.permissions.teamChat.cancel"
                    icon={<ForumOutlinedIcon />}
                    testId="team-chat-dialog"
                    features={features}
                    level={level}
                    policyOf={policyOf}
                    pending={pending}
                    unavailableReason={(feature) =>
                        unavailable(feature) ? t('tenants.permissions.feature.notYetAvailable') : null
                    }
                    notes={
                        features.some((feature) => feature.stored === false) && (
                            <p className={permissionStyles.cardDescriptionSecondary}>
                                {t('tenants.permissions.teamChat.notStoredNote')}
                            </p>
                        )
                    }
                    onSave={onChange}
                    onClose={() => setConfiguring(false)}
                />
            )}
        </>
    );
};
