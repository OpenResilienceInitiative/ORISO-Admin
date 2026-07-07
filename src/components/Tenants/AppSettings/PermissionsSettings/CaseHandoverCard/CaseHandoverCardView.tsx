import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton, Tooltip } from 'antd';
import { ReactComponent as CaseHandoverIcon } from '../../../../../resources/img/svg/permissions/case_handover.svg';
import { M3Switch } from '../../../../M3Switch';
import type { CaseHandoverReasonPolicy } from '../../../../../types/caseHandoverReasonPolicy';
import {
    buildDisplayReasons,
    DisplayReason,
    getNotificationTemplateSample,
    isAdvisorConsentImplicit,
    NOTIFICATION_LANGUAGES,
    NotificationLanguage,
} from './caseHandoverCardUtils';
import cardStyles from '../styles.module.scss';
import styles from './styles.module.scss';

export type CaseHandoverCardViewProps = {
    policies: CaseHandoverReasonPolicy[];
    isLoading: boolean;
    /** false = user may not edit platform reason policies → everything read-only. */
    canEdit: boolean;
    moduleEnabled: boolean;
    onModuleEnabledChange: (enabled: boolean) => void;
    onClientConsentChange: (code: string, clientConsentRequired: boolean) => void;
};

const ConfigureIcon = () => (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path
            d="m8.02 18-.36-2.66c-.24-.09-.5-.22-.77-.39-.28-.16-.52-.33-.73-.51l-2.49 1.04L1.5 11.9l2.13-1.62a3.7 3.7 0 0 1-.06-.62v-.63c0-.19.02-.4.06-.62L1.5 6.79l2.17-3.58 2.49 1.05c.21-.18.45-.35.72-.51.27-.17.53-.29.78-.38L8.02 1h4.05l.36 2.66c.24.09.5.22.77.38.27.16.51.33.72.51l2.49-1.05 2.17 3.58-2.13 1.62c.04.22.06.43.06.62v.63c0 .2-.02.4-.06.62l2.13 1.62-2.17 3.58-2.49-1.04c-.21.18-.45.35-.72.51-.27.17-.53.3-.77.39L12.07 18H8.02Zm2.03-5.25c.9 0 1.66-.31 2.3-.95.63-.63.95-1.4.95-2.3 0-.9-.32-1.66-.95-2.3a3.13 3.13 0 0 0-2.3-.95c-.9 0-1.67.32-2.3.95a3.13 3.13 0 0 0-.95 2.3c0 .9.32 1.67.95 2.3.63.64 1.4.95 2.3.95Z"
            fill="currentColor"
        />
    </svg>
);

const EnforceIcon = () => (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path
            d="M2.5 17.5v-3.02l9.32-9.3 3.02 3-9.32 9.32H2.5Zm11.4-10.38-3-3.02 1.44-1.44a.98.98 0 0 1 .72-.29c.29 0 .53.1.72.29l1.58 1.58c.19.2.29.44.29.72 0 .29-.1.53-.29.72l-1.46 1.44Z"
            fill="currentColor"
        />
    </svg>
);

export const CaseHandoverCardView = ({
    policies,
    isLoading,
    canEdit,
    moduleEnabled,
    onModuleEnabledChange,
    onClientConsentChange,
}: CaseHandoverCardViewProps) => {
    const { t, i18n } = useTranslation();
    const displayReasons = useMemo(() => buildDisplayReasons(policies), [policies]);
    const [activeReasonCode, setActiveReasonCode] = useState<string | null>(null);
    const [activeLanguage, setActiveLanguage] = useState<NotificationLanguage>(() =>
        (NOTIFICATION_LANGUAGES as string[]).includes(i18n.language) ? (i18n.language as NotificationLanguage) : 'de',
    );

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
        <div className={cardStyles.chatTypeCard} data-testid="case-handover-card">
            <div className={cardStyles.cardHeader}>
                <span className={cardStyles.cardIcon} aria-hidden>
                    <CaseHandoverIcon width={40} height={40} />
                </span>
                <h3 className={cardStyles.cardTitle}>{t('tenants.permissions.card.caseHandover.title')}</h3>
            </div>

            {isLoading ? (
                <Skeleton active paragraph={{ rows: 6 }} />
            ) : (
                <>
                    <div className={cardStyles.masterRow}>
                        <span className={cardStyles.masterLabel}>{t('tenants.permissions.card.activated')}</span>
                        <M3Switch
                            checked={moduleEnabled}
                            disabled={!canEdit}
                            label={t('tenants.permissions.card.activated')}
                            onChange={onModuleEnabledChange}
                        />
                    </div>

                    <p className={`${cardStyles.cardDescription} ${styles.cardDescriptionCompact}`}>
                        {t('tenants.permissions.card.caseHandover.description')}
                    </p>

                    <div className={cardStyles.toggleRow}>
                        <span className={cardStyles.toggleLabel}>
                            {t('tenants.permissions.card.caseHandover.optOutMessage')}
                        </span>
                        <Tooltip title={comingSoon}>
                            <span>
                                <M3Switch
                                    checked={false}
                                    disabled
                                    label={t('tenants.permissions.card.caseHandover.optOutMessage')}
                                />
                            </span>
                        </Tooltip>
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
                                    <span>
                                        <M3Switch
                                            checked={activePolicy?.clientConsentRequired ?? false}
                                            disabled={
                                                activeReason.isPlaceholder ||
                                                !activePolicy ||
                                                !canEdit ||
                                                !moduleEnabled
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
                            <div className={cardStyles.toggleRow}>
                                <span className={cardStyles.toggleLabel}>
                                    {t('tenants.permissions.card.caseHandover.consentAdvisor')}
                                </span>
                                <Tooltip title={comingSoon}>
                                    <span>
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
                                    {t(`tenants.permissions.card.caseHandover.language.${language}`)}
                                </button>
                            );
                        })}
                    </div>

                    <Tooltip title={comingSoon}>
                        <div className={styles.notificationField} aria-disabled>
                            <span className={styles.notificationFieldLabel}>
                                {t('tenants.permissions.card.caseHandover.systemNotification')}
                            </span>
                            <p className={styles.notificationFieldText}>
                                {activeReason ? getNotificationTemplateSample(activeReason.code, activeLanguage) : ''}
                            </p>
                        </div>
                    </Tooltip>

                    <p className={styles.enforceHint}>{t('tenants.permissions.card.caseHandover.enforceHint')}</p>

                    <div className={styles.footerActions}>
                        <Tooltip title={comingSoon}>
                            <span>
                                <button type="button" className={styles.footerTextButton} disabled>
                                    <ConfigureIcon />
                                    {t('tenants.permissions.card.caseHandover.configure')}
                                </button>
                            </span>
                        </Tooltip>
                        <Tooltip title={comingSoon}>
                            <span>
                                <button
                                    type="button"
                                    className={`${styles.footerTextButton} ${styles.footerTextButtonPrimary}`}
                                    disabled
                                >
                                    <EnforceIcon />
                                    {t('tenants.permissions.card.caseHandover.enforce')}
                                </button>
                            </span>
                        </Tooltip>
                    </div>
                </>
            )}
        </div>
    );
};
