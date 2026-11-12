import classNames from 'classnames';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../../CardEditable';
import { TileSections } from '../../../TileSections';
import { otherFunctionsHelp } from './help';
import { FormSwitchField } from '../../../FormSwitchField';
import { TEAM_FUNCTIONS } from '../../../TeamFunctions';
import { useSingleTenantData } from '../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../hooks/useTenantAdminDataMutation.hook';
import styles from './styles.module.scss';
import { useAppConfigContext } from '../../../../context/useAppConfig';
import { runtimeConfig } from '../../../../config/runtimeConfig';

import {
    useTenantPermissionPolicies,
    useTenantPermissionPoliciesMutation,
} from '../../../../hooks/useTenantPermissionPolicies';
import { getRestrictedFields, resolvePermissionPolicy } from '../PermissionsSettings/permissionsSettingsUtils';
import {
    PERMISSION_FEATURE_KEYS,
    splitPermissionFeatureWrites,
} from '../PermissionsSettings/permissionFeatureRegistry';
import type { TenantAdminData } from '../../../../types/TenantAdminData';
import { useSupervisionPrivacyConfirm } from '../../../SupervisionPrivacyConfirm';
/**
 * ORISO-Admin#988 / Frank 2026-09-16: supervision is a feature inside conversation types, not a
 * conversation type of its own. It used to be wired as the master of the "groupInternal" chat-type
 * card in PermissionsSettings (chatTypeCards.ts), which was wrong — that card is "internal group
 * chats", a real conversation type. The supervision master (featureSupervisionEnabled) and its
 * seven feature toggles move here, next to the "Allow group chat" switch that stays the master
 * over both group cards (conversation circles + internal group chats).
 */
const SUPERVISION_FEATURE_TOGGLES: Array<{ labelKey: string; field: string }> = [
    { labelKey: 'tenants.permissions.feature.videoCalls', field: 'featureVideoCallsSupervisionChatsEnabled' },
    { labelKey: 'tenants.permissions.feature.audioCalls', field: 'featureAudioCallsSupervisionChatsEnabled' },
    { labelKey: 'tenants.permissions.feature.voiceMessages', field: 'featureVoiceMessagesSupervisionChatsEnabled' },
    { labelKey: 'tenants.permissions.feature.threads', field: 'featureThreadsSupervisionChatsEnabled' },
    { labelKey: 'tenants.permissions.feature.mediaUpload', field: 'featureMediaUploadSupervisionChatsEnabled' },
    {
        labelKey: 'tenants.permissions.feature.mediaInlineDisplay',
        field: 'featureMediaInlineDisplaySupervisionChatsEnabled',
    },
    { labelKey: 'tenants.permissions.feature.mediaAiScan', field: 'featureMediaAiScanSupervisionChatsEnabled' },
];

interface OtherFunctionsSettingsArgs {
    tenantId: string;
    hideTopics?: boolean;
    hideStatistics?: boolean;
    hideGroupChatToggle?: boolean;
}

export const OtherFunctionsSettings = ({
    tenantId,
    hideTopics,
    hideStatistics,
    hideGroupChatToggle,
}: OtherFunctionsSettingsArgs) => {
    const { t } = useTranslation();
    const { settings } = useAppConfigContext();
    const { data, isLoading } = useSingleTenantData({ id: tenantId });
    const { mutate } = useTenantAdminDataMutation({
        id: tenantId,
        successMessageKey: 'tenants.message.settingsUpdate',
    });
    // OBP 2.1 #107: a supervisor reads along — ask about the privacy policy first.
    const confirmSupervision = useSupervisionPrivacyConfirm();
    const extraI18nTopicKey = settings.multitenancyWithSingleDomainEnabled ? '.mtsd' : '';

    // ORISO-TenantService#363: feature switches here show the effective value and save as the
    // Träger's own policy — the same writer as "Funktionszugriff" — never as raw settings.
    const { data: policyData, isLoading: policiesLoading } = useTenantPermissionPolicies(tenantId);
    const updatePolicies = useTenantPermissionPoliciesMutation(tenantId);
    const controls = data?.settings?.tenantAdminControls;
    const restricted = useMemo(
        () => getRestrictedFields(controls?.allowedPermissionToggles, controls?.enforcedPermissionToggles),
        [controls],
    );
    const effective = useMemo(() => {
        const stored = (data?.settings ?? {}) as Record<string, unknown>;
        return Object.fromEntries(
            [...PERMISSION_FEATURE_KEYS].map((field) => [
                field,
                // KI-Bildprüfung: no service runs the scan yet, so it is off whatever is stored.
                field.startsWith('featureMediaAiScan') && !runtimeConfig.mediaAiScanAvailable
                    ? { value: false, mode: 'ENFORCED' as const, inherited: true }
                    : resolvePermissionPolicy(policyData?.policies, field, stored[field], restricted, stored[field]),
            ]),
        );
    }, [data, policyData, restricted]);
    const effectiveValues = useMemo(
        () => Object.fromEntries(Object.entries(effective).map(([field, policy]) => [field, policy.value])),
        [effective],
    );
    const lockedFromAbove = (field: string) =>
        effective[field]?.mode === 'ENFORCED' && effective[field]?.inherited === true;
    const initialValues = useMemo(
        () => ({ ...data, settings: { ...data?.settings, ...effectiveValues } }),
        [data, effectiveValues],
    );
    const save = useCallback(
        async (formData: Partial<TenantAdminData>, options?: { onError?: () => void }) => {
            const { rest, changed } = splitPermissionFeatureWrites(
                formData.settings as Record<string, unknown> | undefined,
                effectiveValues,
                policyData?.policies,
            );
            if (Object.keys(changed).length > 0) {
                try {
                    await updatePolicies.mutateAsync({ tenantId: Number(tenantId), policies: changed });
                } catch {
                    options?.onError?.();
                    return;
                }
            }
            mutate({ ...formData, settings: rest } as Partial<TenantAdminData>, options);
        },
        [effectiveValues, mutate, policyData, tenantId, updatePolicies],
    );
    return (
        <CardEditable
            isLoading={isLoading || policiesLoading}
            initialValues={initialValues}
            titleKey="tenants.appSettings.otherFunctions.title"
            onSave={save as never}
            variant="dialog"
            editButtonPlacement="footer"
            help={otherFunctionsHelp}
        >
            <TileSections>
                <div className={styles.column}>
                    <TileSections.Section id="other-general" title={t('tileHelp.otherFunctions.general.title')}>
                        {!hideTopics && (
                            <div className={styles.checkGroup}>
                                <FormSwitchField
                                    labelKey={`tenants.appSettings.otherFunctions${extraI18nTopicKey}.allowTopicCreation.title`}
                                    name={['settings', 'featureTopicsEnabled']}
                                    inline
                                    disableLabels
                                />
                                <p className={styles.checkInfo}>
                                    {t(
                                        `tenants.appSettings.otherFunctions${extraI18nTopicKey}.allowTopicCreation.description`,
                                    )}
                                </p>
                            </div>
                        )}
                        {!hideStatistics && (
                            <div className={styles.checkGroup}>
                                <FormSwitchField
                                    labelKey="tenants.appSettings.otherFunctions.statistics.title"
                                    name={['settings', 'featureStatisticsEnabled']}
                                    inline
                                    disableLabels
                                />
                                <p className={styles.checkInfo}>
                                    {t('tenants.appSettings.otherFunctions.statistics.description')}
                                </p>
                            </div>
                        )}
                        {!hideGroupChatToggle && (
                            <div className={styles.checkGroup}>
                                <FormSwitchField
                                    labelKey="tenants.appSettings.otherFunctions.groupChat.title"
                                    name={['settings', 'featureGroupChatV2Enabled']}
                                    disabled={lockedFromAbove('featureGroupChatV2Enabled')}
                                    inline
                                    disableLabels
                                />
                                <p className={styles.checkInfo}>
                                    {t('tenants.appSettings.otherFunctions.groupChat.description')}
                                </p>
                            </div>
                        )}
                    </TileSections.Section>
                    <TileSections.Section id="other-team" title={t(TEAM_FUNCTIONS.chat.nameKey)}>
                        {/* Same row as its siblings in this tile; name and description come from the shared source. */}
                        <div className={styles.checkGroup}>
                            <FormSwitchField
                                labelKey={TEAM_FUNCTIONS.chat.nameKey}
                                name={TEAM_FUNCTIONS.chat.field}
                                inline
                                disableLabels
                            />
                            <p className={styles.checkInfo}>{t(TEAM_FUNCTIONS.chat.descriptionKey)}</p>
                        </div>
                    </TileSections.Section>
                </div>
                <TileSections.Section id="other-supervision" title={t('tileHelp.otherFunctions.supervision.title')}>
                    <div className={styles.checkGroup}>
                        <FormSwitchField
                            labelKey="tenants.appSettings.otherFunctions.supervision.title"
                            name={['settings', 'featureSupervisionEnabled']}
                            disabled={lockedFromAbove('featureSupervisionEnabled')}
                            inline
                            disableLabels
                            confirmEnable={confirmSupervision.confirmEnable}
                        />
                        <p className={styles.checkInfo}>
                            {t('tenants.appSettings.otherFunctions.supervision.description')}
                        </p>
                        {confirmSupervision.dialog}
                    </div>
                    <>
                        {SUPERVISION_FEATURE_TOGGLES.map(({ labelKey, field }) => {
                            const capabilityUnavailable =
                                field === 'featureMediaAiScanSupervisionChatsEnabled' &&
                                !runtimeConfig.mediaAiScanAvailable;
                            return (
                                <div key={field} className={classNames(styles.checkGroup, styles.supervisionChild)}>
                                    <FormSwitchField
                                        labelKey={labelKey}
                                        name={['settings', field]}
                                        inline
                                        disableLabels
                                        disabled={capabilityUnavailable || lockedFromAbove(field)}
                                    />
                                    {capabilityUnavailable && (
                                        <p className={styles.checkInfo}>
                                            {t('tenants.permissions.feature.mediaAiScanUnavailable')}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </>
                </TileSections.Section>
            </TileSections>
        </CardEditable>
    );
};
