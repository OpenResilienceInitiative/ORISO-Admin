import { Button, Form } from 'antd';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import { ThemeProvider } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdminFeedback } from '../../hooks/useAdminFeedback';
import { MuiFormField, MuiNumberFormField, MuiPasswordFormField } from '../../components/mui/MuiFormField';
import { CardEditable } from '../../components/CardEditable';
import { Card } from '../../components/Card';
import { CardGrid } from '../../components/CardGrid';
import { MuiSwitchField } from '../../components/mui/MuiSwitchField/index';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { useAppConfigContext } from '../../context/useAppConfig';
import { useSettingsAdminMutation } from '../../hooks/useSettingsAdminMutation.hook';
import { useUserData } from '../../hooks/useUserData.hook';
import { sendGlobalSmtpTestEmail } from '../../api/settings/sendGlobalSmtpTestEmail';
import { usePlatformSmtpSettings } from '../../hooks/usePlatformSmtpSettings';
import { useSmtpSyncStatus } from '../../hooks/useSmtpSyncStatus';
import { SmtpSyncStatus } from '../../api/settings/getSmtpSyncStatus';
import { TranslationApiKeysCardContainer } from '../../components/GlobalSettings/TranslationApiKeysCardContainer';
import { DocumentMasterDataCardContainer } from '../../components/GlobalSettings/DocumentMasterDataCardContainer';
import { platformSmtpHelp } from '../../components/Tenants/AppSettings/SmtpSettings/help';
import { TilePicture } from '../../components/TileFill';
import { TileSections } from '../../components/TileSections';
import mailServerPicture from '../../resources/img/tile-help/mail-server.webp';
import styles from './styles.module.scss';
import { extractApiErrorMessage } from '../../utils/extractApiErrorMessage';
import { ChatRecoverySettingsCard } from '../../components/GlobalSettings/ChatRecoverySettingsCard';
import { useChatRecoverySettings } from '../../hooks/useChatRecoverySettings.hook';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { AccountInactivitySettingsCardContainer } from '../../components/GlobalSettings/AccountInactivitySettingsCard';
import { OneTopicPerAgencySettingsCardContainer } from '../../components/GlobalSettings/OneTopicPerAgencySettingsCard';
import { SupportEmailSettingsCardContainer } from '../../components/GlobalSettings/SupportEmailSettingsCard';
import { CounsellorTutorialSettingsCardContainer } from '../../components/GlobalSettings/CounsellorTutorialSettingsCard';
import { FurtherCounsellingPostcodeSettingsCardContainer } from '../../components/GlobalSettings/FurtherCounsellingPostcodeSettingsCard';
import { TopicDuplicateSettingsCardContainer } from '../../components/GlobalSettings/TopicDuplicateSettingsCard';
import { TemporaryAccountSettingsCardsContainer } from '../../components/GlobalSettings/TemporaryAccountSettingsCards';
import { StatisticsSettingsCardContainer } from '../../components/GlobalSettings/StatisticsSettingsCard';
import { Notify } from '../../components/Notify';

const smtpSyncMessageKeys: Record<SmtpSyncStatus, string> = {
    UNKNOWN: 'globalSettings.smtp.sync.unknown',
    SMTP_SYNC_PENDING: 'globalSettings.smtp.sync.pending',
    APPLIED: 'globalSettings.smtp.sync.applied',
    DISABLED_OR_INCOMPLETE: 'globalSettings.smtp.sync.disabled',
};

export const GlobalLoginSettingsPage = () => {
    const { isSuperAdmin } = useUserRoles();
    const recoverySettings = useChatRecoverySettings(isSuperAdmin);

    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <CardGrid raster>
                <CardGrid.Item>
                    <OneTopicPerAgencySettingsCardContainer />
                </CardGrid.Item>
                <CardGrid.Item>
                    <SupportEmailSettingsCardContainer />
                </CardGrid.Item>
                <CardGrid.Item>
                    <FurtherCounsellingPostcodeSettingsCardContainer />
                </CardGrid.Item>
                <CardGrid.Item>
                    <TopicDuplicateSettingsCardContainer />
                </CardGrid.Item>
                <CardGrid.Item>
                    <CounsellorTutorialSettingsCardContainer />
                </CardGrid.Item>
                <CardGrid.Item>
                    <TranslationApiKeysCardContainer />
                </CardGrid.Item>
                {isSuperAdmin && (
                    <CardGrid.Item>
                        <AccountInactivitySettingsCardContainer />
                    </CardGrid.Item>
                )}
                {/* ORISO-Admin#1241: temporary guest accounts and their messages, next to the
                    account-inactivity card. Platform admin only. */}
                {isSuperAdmin && <TemporaryAccountSettingsCardsContainer />}
                {isSuperAdmin && (
                    <CardGrid.Item>
                        <ChatRecoverySettingsCard
                            data={recoverySettings.data}
                            isLoading={recoverySettings.isLoading}
                            isSaving={recoverySettings.isSaving}
                            error={recoverySettings.error}
                            onSave={(settings, options) =>
                                recoverySettings.save(settings, { onError: options?.onError })
                            }
                        />
                    </CardGrid.Item>
                )}
                {/* OBP #93: global statistics settings with their change protocol. Platform
                    admin only; the UserService enforces the same. */}
                {isSuperAdmin && (
                    <CardGrid.Item span={3}>
                        <StatisticsSettingsCardContainer />
                    </CardGrid.Item>
                )}
                {/* ORISO-Admin#735: operator master data for the living DPIA and the other legal
                    documents. */}
                <CardGrid.Item span={3}>
                    <DocumentMasterDataCardContainer />
                </CardGrid.Item>
            </CardGrid>
        </ThemeProvider>
    );
};

export const GlobalSmtpSettingsPage = () => {
    const { message } = useAdminFeedback();
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [testForm] = Form.useForm();
    const { settings } = useAppConfigContext();
    const { data: userData } = useUserData();
    const { mutate, isPending } = useSettingsAdminMutation(undefined, { silentSuccess: true });
    const { data: platformSmtp, isLoading, isFetching, isError, refetch } = usePlatformSmtpSettings();
    const [savedSync, setSavedSync] = useState<{ status: SmtpSyncStatus; revision: number | null } | null>(null);
    const { data: persistedSync, refetch: refetchSync } = useSmtpSyncStatus(
        savedSync?.status === 'SMTP_SYNC_PENDING' ? savedSync.revision : null,
    );
    const [isTestSending, setIsTestSending] = useState(false);
    useEffect(() => {
        if (userData?.email && !testForm.getFieldValue('recipientEmail')) {
            testForm.setFieldValue('recipientEmail', userData.email);
        }
    }, [testForm, userData?.email]);
    const initialValues = useMemo(
        () => ({
            globalFeatureSystemNotificationEmailsEnabled:
                settings.globalFeatureSystemNotificationEmailsEnabled ?? false,
            globalSmtpEnabled: settings.globalSmtpEnabled ?? false,
            globalSmtpHost: settings.globalSmtpHost ?? '',
            globalSmtpPort: settings.globalSmtpPort ?? '587',
            globalSmtpSecure: settings.globalSmtpSecure ?? false,
            // CTS-C01: the public settings payload never carries the stored SMTP
            // credentials, so these two fields are set-only. They always start
            // empty; an empty field on save means "keep the stored value".
            globalSmtpUsername: '',
            globalSmtpPassword: '',
            globalSmtpFrom: settings.globalSmtpFrom ?? '',
        }),
        [settings],
    );
    const [savedValues, setSavedValues] = useState(initialValues);
    useEffect(() => {
        if (!form.isFieldsTouched()) {
            setSavedValues(initialValues);
            form.setFields(Object.entries(initialValues).map(([name, value]) => ({ name, value, touched: false })));
        }
    }, [form, initialValues]);
    const currentValues = Form.useWatch([], form);
    const hasChangedSavedSettings = useCallback(
        (values: Record<string, unknown>) =>
            Object.entries(savedValues).some(([name, savedValue]) => {
                const currentValue = values[name];
                // Settings store the port as text; the number field emits a number after editing.
                return name === 'globalSmtpPort'
                    ? String(currentValue ?? '') !== String(savedValue ?? '')
                    : currentValue !== savedValue;
            }),
        [savedValues],
    );
    const hasUnsavedChanges = currentValues !== undefined && hasChangedSavedSettings(currentValues);
    const isSummaryLoading = isLoading || isFetching;
    const isTestBlocked = hasUnsavedChanges || isPending || isSummaryLoading || isError || !platformSmtp;
    const syncStatus = useMemo(() => {
        if (!savedSync) return persistedSync?.status;
        if (savedSync.revision !== null && persistedSync && persistedSync.revision >= savedSync.revision)
            return persistedSync.status;
        return savedSync.status;
    }, [persistedSync, savedSync]);
    const handleSave = useCallback(
        (formData: unknown, options?: { onError?: () => void }) => {
            const submittedValues = formData as typeof initialValues;
            const { globalSmtpUsername, globalSmtpPassword, ...rest } = submittedValues;
            // Credentials are write-only: blank means retain the saved secret.
            mutate(
                {
                    ...rest,
                    ...(globalSmtpUsername?.trim() ? { globalSmtpUsername } : {}),
                    ...(globalSmtpPassword?.trim() ? { globalSmtpPassword } : {}),
                },
                {
                    ...options,
                    onSuccess: async (responseData) => {
                        const response = responseData instanceof Response ? responseData : null;
                        const rawStatus = response?.headers.get('X-Smtp-Sync-Status');
                        const rawRevision = response?.headers.get('X-Smtp-Revision');
                        const parsedRevision = rawRevision && /^\d+$/.test(rawRevision) ? Number(rawRevision) : null;
                        const revision =
                            parsedRevision !== null && Number.isSafeInteger(parsedRevision) ? parsedRevision : null;
                        const status: SmtpSyncStatus =
                            revision !== null &&
                            (rawStatus === 'SMTP_SYNC_PENDING' ||
                                rawStatus === 'APPLIED' ||
                                rawStatus === 'DISABLED_OR_INCOMPLETE')
                                ? rawStatus
                                : 'UNKNOWN';
                        setSavedSync({ status, revision });
                        // Keycloak picks up SMTP changes via a periodic Job, so say how long that takes.
                        if (status === 'SMTP_SYNC_PENDING')
                            message.info({ content: t('globalSettings.smtp.sync.savedPendingSnackbar'), duration: 8 });
                        else message.success({ content: t('message.success.setting.update'), duration: 3 });
                        const acknowledgedValues = {
                            ...submittedValues,
                            globalSmtpUsername: '',
                            globalSmtpPassword: '',
                        };
                        form.setFieldsValue(acknowledgedValues);
                        setSavedValues(acknowledgedValues);
                        // Testing remains blocked until the saved snapshot has been refreshed.
                        await Promise.all([refetch(), refetchSync()]);
                    },
                },
            );
        },
        [form, mutate, refetch, refetchSync, t],
    );
    const handleSendTestEmail = useCallback(async () => {
        if (isTestBlocked) return;
        const { recipientEmail } = await testForm.validateFields();
        // Check the live form too, so async validation cannot test a newly changed draft.
        if (hasChangedSavedSettings(form.getFieldsValue(true))) return;
        const cleanedRecipientEmail = (recipientEmail || '').trim();
        if (!cleanedRecipientEmail) {
            message.error(t('globalSettings.smtp.test.errorMissingRecipient'));
            return;
        }
        setIsTestSending(true);
        try {
            await sendGlobalSmtpTestEmail({ recipientEmail: cleanedRecipientEmail });
            message.success(t('globalSettings.smtp.test.success', { email: cleanedRecipientEmail }));
        } catch (error) {
            const errorMessage = await extractApiErrorMessage(error, 'globalSettings.smtp.test.error');
            message.error(errorMessage);
        } finally {
            setIsTestSending(false);
        }
    }, [form, hasChangedSavedSettings, isTestBlocked, t, testForm]);
    const renderSwitchLabel = useCallback(
        (titleKey: string, descriptionKey: string) => (
            <span className={styles.switchCopy}>
                <span className={styles.switchTitle}>{t(titleKey)}</span>
                <span className={styles.switchDescription}>{t(descriptionKey)}</span>
            </span>
        ),
        [t],
    );

    const display = (value: string | number | null | undefined) =>
        value == null || value === '' ? t('globalSettings.smtp.saved.unavailable') : String(value);

    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <CardGrid raster>
                <CardGrid.Item span={2}>
                    <CardEditable
                        className={styles.smtpCard}
                        variant="dialog"
                        headerIcon={<EmailOutlinedIcon />}
                        isLoading={isPending}
                        allowEdit={!isPending}
                        initialValues={savedValues}
                        titleKey="globalSettings.smtp.title"
                        help={platformSmtpHelp}
                        subTitleKey="globalSettings.smtp.description"
                        onSave={handleSave}
                        formProp={form}
                    >
                        <TileSections>
                            <TileSections.Section id="smtp-sending" title={t('tileHelp.mailPanels.sending')}>
                                <div className={styles.fieldGrid}>
                                    <MuiSwitchField
                                        className={styles.smtpSwitch}
                                        label={renderSwitchLabel(
                                            'globalSettings.smtp.systemEmailToggle.title',
                                            'globalSettings.smtp.systemEmailToggle.description',
                                        )}
                                        name={['globalFeatureSystemNotificationEmailsEnabled']}
                                        switchLabel={t('globalSettings.smtp.systemEmailToggle.title')}
                                    />
                                    <MuiSwitchField
                                        className={styles.smtpSwitch}
                                        label={renderSwitchLabel(
                                            'globalSettings.smtp.smtpToggle.title',
                                            'globalSettings.smtp.smtpToggle.description',
                                        )}
                                        name={['globalSmtpEnabled']}
                                        switchLabel={t('globalSettings.smtp.smtpToggle.title')}
                                    />
                                </div>
                            </TileSections.Section>
                            <TileSections.Section id="smtp-server" title={t('tileHelp.mailPanels.server')}>
                                <div className={styles.fieldGrid}>
                                    <MuiFormField label={t('globalSettings.smtp.host')} name={['globalSmtpHost']} />
                                    <MuiNumberFormField
                                        label={t('globalSettings.smtp.port')}
                                        name={['globalSmtpPort']}
                                    />
                                    <MuiFormField label={t('globalSettings.smtp.from')} name={['globalSmtpFrom']} />
                                    <MuiSwitchField
                                        className={styles.smtpSwitch}
                                        label={renderSwitchLabel(
                                            'globalSettings.smtp.secure',
                                            'globalSettings.smtp.secure.description',
                                        )}
                                        name={['globalSmtpSecure']}
                                        switchLabel={t('globalSettings.smtp.secure')}
                                    />
                                </div>
                            </TileSections.Section>
                            <TileSections.Section id="smtp-credentials" title={t('tileHelp.mailPanels.credentials')}>
                                <div className={styles.fieldGrid}>
                                    <MuiFormField
                                        label={t('globalSettings.smtp.username')}
                                        name={['globalSmtpUsername']}
                                        placeholder={t('globalSettings.smtp.username.placeholder')}
                                        helpText={t('globalSettings.smtp.username.helpText')}
                                        autoComplete="off"
                                    />
                                    <MuiPasswordFormField
                                        label={t('globalSettings.smtp.password')}
                                        name={['globalSmtpPassword']}
                                        placeholder={t('globalSettings.smtp.password.placeholder')}
                                        helpText={t('globalSettings.smtp.password.helpText')}
                                        autoComplete="new-password"
                                    />
                                </div>
                            </TileSections.Section>
                        </TileSections>
                    </CardEditable>
                </CardGrid.Item>
                <CardGrid.Item>
                    <Card
                        className={styles.smtpCard}
                        variant="dialog"
                        headerIcon={<EmailOutlinedIcon />}
                        titleKey="globalSettings.smtp.saved.title"
                        subTitleKey="globalSettings.smtp.saved.description"
                    >
                        {isSummaryLoading && (
                            <p className={styles.smtpReadStatus} role="status">
                                {t('globalSettings.smtp.saved.loading')}
                            </p>
                        )}
                        {!isSummaryLoading && (isError || !platformSmtp) && (
                            <Notify
                                title={t('notify.title.globalSettings')}
                                severity="error"
                                quietText={t('notify.tile.notLoaded')}
                                actions={[{ label: t('globalSettings.smtp.saved.retry'), onClick: () => refetch() }]}
                            >
                                {t('globalSettings.smtp.saved.error')}
                            </Notify>
                        )}
                        {!isSummaryLoading && !isError && platformSmtp && (
                            <dl className={styles.smtpReadOnly}>
                                <div>
                                    <dt>{t('globalSettings.smtp.host')}</dt>
                                    <dd>{display(platformSmtp.host)}</dd>
                                </div>
                                <div>
                                    <dt>{t('globalSettings.smtp.port')}</dt>
                                    <dd>{display(platformSmtp.port)}</dd>
                                </div>
                                <div>
                                    <dt>{t('globalSettings.smtp.secure')}</dt>
                                    <dd>
                                        {platformSmtp.secure == null
                                            ? display(null)
                                            : t(
                                                  platformSmtp.secure
                                                      ? 'globalSettings.smtp.saved.yes'
                                                      : 'globalSettings.smtp.saved.no',
                                              )}
                                    </dd>
                                </div>
                                <div>
                                    <dt>{t('globalSettings.smtp.from')}</dt>
                                    <dd>{display(platformSmtp.from)}</dd>
                                </div>
                                <div>
                                    <dt>{t('globalSettings.smtp.saved.credentials')}</dt>
                                    <dd>
                                        {t(
                                            platformSmtp.credentialsPresent
                                                ? 'globalSettings.smtp.saved.yes'
                                                : 'globalSettings.smtp.saved.no',
                                        )}
                                    </dd>
                                </div>
                                <div>
                                    <dt>{t('globalSettings.smtp.saved.configured')}</dt>
                                    <dd>
                                        {t(
                                            platformSmtp.configured
                                                ? 'globalSettings.smtp.saved.yes'
                                                : 'globalSettings.smtp.saved.no',
                                        )}
                                    </dd>
                                </div>
                            </dl>
                        )}
                        {/* The sync status speaks about the saved settings: only when they were read. */}
                        {syncStatus && !isSummaryLoading && !isError && platformSmtp && (
                            <p className={styles.smtpReadStatus} role="status">
                                {t(smtpSyncMessageKeys[syncStatus])}
                            </p>
                        )}
                    </Card>
                </CardGrid.Item>
                <CardGrid.Item>
                    <Card
                        className={styles.smtpCard}
                        variant="dialog"
                        headerIcon={<SendOutlinedIcon />}
                        titleKey="globalSettings.smtp.test.title"
                        picture={<TilePicture src={mailServerPicture} />}
                        subTitleKey="globalSettings.smtp.test.description"
                    >
                        <p className={styles.settingDescription}>{t('globalSettings.smtp.test.saveFirst')}</p>
                        <Form
                            className={styles.testForm}
                            form={testForm}
                            layout="vertical"
                            initialValues={{ recipientEmail: userData?.email ?? '' }}
                        >
                            <MuiFormField
                                label={t('globalSettings.smtp.test.recipientEmail')}
                                name={['recipientEmail']}
                                required
                                rules={[{ type: 'email', message: t('message.error.email.incorrect') }]}
                            />
                            <div className={styles.testAction}>
                                <Button
                                    className={styles.smtpActionButton}
                                    disabled={isTestBlocked}
                                    loading={isTestSending}
                                    onClick={handleSendTestEmail}
                                >
                                    {t('globalSettings.smtp.test.button')}
                                </Button>
                            </div>
                        </Form>
                    </Card>
                </CardGrid.Item>
            </CardGrid>
        </ThemeProvider>
    );
};
