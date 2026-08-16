import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton, Tooltip } from 'antd';
import { ReactComponent as CaseHandoverIcon } from '../../../../../resources/img/svg/permissions/case_handover.svg';
import { Card } from '../../../../Card';
import { M3Switch } from '../../../../M3Switch';
import { M3DurationField } from '../../../../M3NumberField';
import { PermissionPolicyControl } from '../../../../PermissionPolicyControl/PermissionPolicyControl';
import type { CaseHandoverReasonPolicy } from '../../../../../types/caseHandoverReasonPolicy';
import type { PolicyValue } from '../../../../../types/permissionPolicy';
import {
    buildDisplayReasons,
    DisplayReason,
    getNotificationTemplate,
    isAdvisorConsentImplicit,
    NOTIFICATION_LANGUAGES,
    NotificationLanguage,
} from './caseHandoverCardUtils';
import cardStyles from '../styles.module.scss';
import styles from './styles.module.scss';

/*
 * This card previews not-yet-available controls as disabled with a "coming soon"
 * tooltip. Native `disabled` elements are removed from the tab order and emit no
 * hover/focus events, so each is wrapped in a focusable span/div (tabIndex) so the
 * tooltip stays reachable by keyboard and pointer. jsx-a11y flags tabIndex on
 * these non-interactive wrappers, which is exactly the intended pattern here.
 */
/* eslint-disable jsx-a11y/no-noninteractive-tabindex */

export type CaseHandoverCardViewProps = {
    policies: CaseHandoverReasonPolicy[];
    isLoading: boolean;
    isSaving?: boolean;
    /** false = user may not edit platform reason policies → everything read-only. */
    canEdit: boolean;
    moduleEnabled: boolean;
    onModuleEnabledChange: (enabled: boolean) => void;
    onClientConsentChange: (code: string, clientConsentRequired: boolean) => void;
    onNotificationTemplateChange: (code: string, language: NotificationLanguage, text: string) => void;
    onMaxAccessDurationChange: (code: string, minutes: number) => void;
    policyLevel?: 'platform' | 'tenant' | 'agency';
    permissionPolicies?: Record<string, PolicyValue<boolean>>;
    pendingPolicyFields?: ReadonlySet<string>;
    openPolicyMenu?: string | null;
    onOpenPolicyMenu?: (fieldKey: string | null) => void;
    onFeaturePolicyChange?: (fieldKey: string, policy: PolicyValue<boolean>) => void;
};

const ConfigureIcon = () => (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path
            d="m8.02 18-.36-2.66c-.24-.09-.5-.22-.77-.39-.28-.16-.52-.33-.73-.51l-2.49 1.04L1.5 11.9l2.13-1.62a3.7 3.7 0 0 1-.06-.62v-.63c0-.19.02-.4.06-.62L1.5 6.79l2.17-3.58 2.49 1.05c.21-.18.45-.35.72-.51.27-.17.53-.29.78-.38L8.02 1h4.05l.36 2.66c.24.09.5.22.77.38.27.16.51.33.72.51l2.49-1.05 2.17 3.58-2.13 1.62c.04.22.06.43.06.62v.63c0 .2-.02.4-.06.62l2.13 1.62-2.17 3.58-2.49-1.04c-.21.18-.45.35-.72.51-.27.17-.53.3-.77.39L12.07 18H8.02Zm2.03-5.25c.9 0 1.66-.31 2.3-.95.63-.63.95-1.4.95-2.3 0-.9-.32-1.66-.95-2.3a3.13 3.13 0 0 0-2.3-.95c-.9 0-1.67.32-2.3.95a3.13 3.13 0 0 0-.95 2.3c0 .9.32 1.67.95 2.3.63.64 1.4.95 2.3.95Z"
            fill="currentColor"
        />
    </svg>
);

export const CaseHandoverCardView = ({
    policies,
    isLoading,
    isSaving = false,
    canEdit,
    moduleEnabled,
    onModuleEnabledChange,
    onClientConsentChange,
    onNotificationTemplateChange,
    onMaxAccessDurationChange,
    policyLevel = 'tenant',
    permissionPolicies,
    pendingPolicyFields,
    openPolicyMenu,
    onOpenPolicyMenu,
    onFeaturePolicyChange,
}: CaseHandoverCardViewProps) => {
    const { t, i18n } = useTranslation();
    const displayReasons = useMemo(() => buildDisplayReasons(policies), [policies]);
    const [activeReasonCode, setActiveReasonCode] = useState<string | null>(null);
    const [activeLanguage, setActiveLanguage] = useState<NotificationLanguage>(() => {
        // i18n.language can be region-qualified (e.g. "en-US"); match on the base language.
        const baseLanguage = i18n.language?.toLowerCase().split('-')[0];
        return (NOTIFICATION_LANGUAGES as string[]).includes(baseLanguage)
            ? (baseLanguage as NotificationLanguage)
            : 'de';
    });

    const [templateDrafts, setTemplateDrafts] = useState<Record<string, string>>({});
    const [localOpenPolicyMenu, setLocalOpenPolicyMenu] = useState<string | null>(null);
    const currentOpenPolicyMenu = openPolicyMenu === undefined ? localOpenPolicyMenu : openPolicyMenu;
    const setOpenPolicyMenu = onOpenPolicyMenu ?? setLocalOpenPolicyMenu;

    const activeReason: DisplayReason | null =
        displayReasons.find((reason) => reason.code === activeReasonCode) ?? displayReasons[0] ?? null;
    const activePolicy = activeReason?.policy ?? null;

    const reasonLabel = (reason: DisplayReason) => {
        const key = `tenants.permissions.card.caseHandover.reason.${reason.code}`;
        const translated = t(key);
        return translated === key ? reason.policy?.label ?? reason.code : translated;
    };

    const comingSoon = t('tenants.permissions.card.caseHandover.comingSoon');

    return (
        <Card
            dataTestId="case-handover-card"
            headerIcon={<CaseHandoverIcon width={40} height={40} />}
            titleKey="tenants.permissions.card.caseHandover.title"
        >
            {isLoading ? (
                <Skeleton active paragraph={{ rows: 6 }} />
            ) : (
                <>
                    <div className={styles.featureRow}>
                        <PermissionPolicyControl
                            featureKey="caseHandoverEnabled"
                            label={t('tenants.permissions.card.activated')}
                            level={policyLevel}
                            policy={
                                permissionPolicies?.caseHandoverEnabled ?? {
                                    value: moduleEnabled,
                                    mode: canEdit ? 'SUGGESTED' : 'ENFORCED',
                                    inherited: !canEdit,
                                }
                            }
                            open={currentOpenPolicyMenu === 'caseHandoverEnabled'}
                            pending={pendingPolicyFields?.has('caseHandoverEnabled')}
                            onOpenChange={(open) => setOpenPolicyMenu(open ? 'caseHandoverEnabled' : null)}
                            onChange={(next) => {
                                onFeaturePolicyChange?.('caseHandoverEnabled', next);
                                onModuleEnabledChange(next.value);
                            }}
                        />
                    </div>

                    <p className={styles.helperText}>{t('tenants.permissions.card.caseHandover.description')}</p>

                    <div className={styles.featureRow}>
                        <PermissionPolicyControl
                            featureKey="caseHandoverTeamAccessOptOut"
                            label={t('tenants.permissions.card.caseHandover.teamAccessOptOut')}
                            level={policyLevel}
                            policy={
                                permissionPolicies?.caseHandoverTeamAccessOptOut ?? {
                                    value: true,
                                    mode: 'ENFORCED',
                                    inherited: policyLevel !== 'platform',
                                }
                            }
                            open={currentOpenPolicyMenu === 'caseHandoverTeamAccessOptOut'}
                            pending={pendingPolicyFields?.has('caseHandoverTeamAccessOptOut')}
                            onOpenChange={(open) => setOpenPolicyMenu(open ? 'caseHandoverTeamAccessOptOut' : null)}
                            onChange={(next) => onFeaturePolicyChange?.('caseHandoverTeamAccessOptOut', next)}
                        />
                    </div>

                    <div
                        className={styles.reasonTabs}
                        role="tablist"
                        aria-label={t('tenants.permissions.card.caseHandover.reasonsAria')}
                    >
                        {displayReasons.map((reason) => {
                            const isActive = reason.code === activeReason?.code;
                            return (
                                <button
                                    key={reason.code}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    className={`${styles.reasonTab} ${isActive ? styles.reasonTabActive : ''} ${
                                        reason.isPlaceholder ? styles.reasonTabPlaceholder : ''
                                    }`}
                                    onClick={() => setActiveReasonCode(reason.code)}
                                >
                                    {reasonLabel(reason)}
                                </button>
                            );
                        })}
                    </div>

                    {activeReason && (
                        <div className={styles.consentRows}>
                            <div className={cardStyles.toggleRow}>
                                <span className={cardStyles.toggleLabel}>
                                    {t('tenants.permissions.card.caseHandover.consentClient')}
                                </span>
                                <Tooltip title={activeReason.isPlaceholder ? comingSoon : undefined}>
                                    <span tabIndex={activeReason.isPlaceholder ? 0 : undefined}>
                                        <M3Switch
                                            checked={activePolicy?.clientConsentRequired ?? false}
                                            disabled={
                                                activeReason.isPlaceholder ||
                                                !activePolicy ||
                                                !canEdit ||
                                                !moduleEnabled ||
                                                isSaving
                                            }
                                            label={`${t(
                                                'tenants.permissions.card.caseHandover.consentClient',
                                            )} (${reasonLabel(activeReason)})`}
                                            onChange={(value) =>
                                                activePolicy && onClientConsentChange(activePolicy.code, value)
                                            }
                                        />
                                    </span>
                                </Tooltip>
                            </div>
                            {activeReason.code === 'COUNSELLOR_ASKED_FOR_ADVICE' && (
                                <div className={styles.durationField}>
                                    <M3DurationField
                                        label={t('tenants.permissions.card.caseHandover.maxSessionDuration')}
                                        value={activePolicy?.maxAccessDurationMinutes ?? 180}
                                        readOnly={
                                            !activePolicy ||
                                            !canEdit ||
                                            !moduleEnabled ||
                                            activeReason.isPlaceholder ||
                                            isSaving
                                        }
                                        onChange={(minutes) => {
                                            if (activePolicy && minutes !== undefined) {
                                                onMaxAccessDurationChange(activePolicy.code, minutes);
                                            }
                                        }}
                                    />
                                </div>
                            )}
                            <div className={cardStyles.toggleRow}>
                                <span className={cardStyles.toggleLabel}>
                                    {t('tenants.permissions.card.caseHandover.consentAdvisor')}
                                </span>
                                <Tooltip title={comingSoon}>
                                    <span tabIndex={0}>
                                        <M3Switch
                                            checked={isAdvisorConsentImplicit(activeReason.code)}
                                            disabled
                                            label={`${t(
                                                'tenants.permissions.card.caseHandover.consentAdvisor',
                                            )} (${reasonLabel(activeReason)})`}
                                        />
                                    </span>
                                </Tooltip>
                            </div>
                            {activeReason.isPlaceholder && (
                                <p className={styles.placeholderHint}>
                                    {t('tenants.permissions.card.caseHandover.placeholderHint')}
                                </p>
                            )}
                        </div>
                    )}

                    <div
                        className={styles.languageChips}
                        role="tablist"
                        aria-label={t('tenants.permissions.card.caseHandover.languagesAria')}
                    >
                        {NOTIFICATION_LANGUAGES.map((language) => {
                            const isActive = language === activeLanguage;
                            return (
                                <button
                                    key={language}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    className={`${styles.languageChip} ${isActive ? styles.languageChipActive : ''}`}
                                    onClick={() => setActiveLanguage(language)}
                                >
                                    {t(`language.${language}`)}
                                </button>
                            );
                        })}
                    </div>

                    {activeReason &&
                        (() => {
                            const draftKey = `${activeReason.code}|${activeLanguage}`;
                            const storedTemplate = getNotificationTemplate(activePolicy, activeLanguage);
                            const value = templateDrafts[draftKey] ?? storedTemplate;
                            const editable =
                                canEdit &&
                                moduleEnabled &&
                                !activeReason.isPlaceholder &&
                                Boolean(activePolicy) &&
                                !isSaving;
                            const commitDraft = () => {
                                const draft = templateDrafts[draftKey];
                                if (draft === undefined || draft.trim() === storedTemplate.trim()) {
                                    return;
                                }
                                onNotificationTemplateChange(activeReason.code, activeLanguage, draft);
                                setTemplateDrafts((drafts) => {
                                    const next = { ...drafts };
                                    delete next[draftKey];
                                    return next;
                                });
                            };
                            const fieldLabel = `${t('tenants.permissions.card.caseHandover.systemNotification')} (${t(
                                `language.${activeLanguage}`,
                            )})`;
                            return (
                                <div className={styles.notificationField}>
                                    <span className={styles.notificationFieldLabel}>
                                        {t('tenants.permissions.card.caseHandover.systemNotification')}
                                    </span>
                                    <textarea
                                        className={styles.notificationFieldInput}
                                        value={value}
                                        rows={3}
                                        disabled={!editable}
                                        aria-label={fieldLabel}
                                        data-testid="case-handover-template-input"
                                        onChange={(event) =>
                                            setTemplateDrafts((drafts) => ({
                                                ...drafts,
                                                [draftKey]: event.target.value,
                                            }))
                                        }
                                        onBlur={commitDraft}
                                    />
                                </div>
                            );
                        })()}

                    <p className={styles.templateHintBelow}>
                        {t('tenants.permissions.card.caseHandover.templateHint', {
                            newAdvisor: '{{newAdvisor}}',
                        })}
                    </p>

                    <div className={styles.footerActions}>
                        <Tooltip title={comingSoon}>
                            <span tabIndex={0}>
                                <button type="button" className={styles.footerTextButton} disabled>
                                    <ConfigureIcon />
                                    {t('tenants.permissions.card.caseHandover.configure')}
                                </button>
                            </span>
                        </Tooltip>
                    </div>
                </>
            )}
        </Card>
    );
};
