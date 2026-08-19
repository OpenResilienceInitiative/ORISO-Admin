import { Alert, Button, Form, notification } from 'antd';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { AgencyAccessError } from '../../../api/agency/getAgencyById';
import { PostCodeRange } from '../../../api/agency/getAgencyPostCodeRange';
import { normalizeTopicIds } from '../../../api/agency/normalizeTopicIds';
import routePathNames from '../../../appConfig';
import { Page } from '../../../components/Page';
import { CardDeck } from '../../../components/CardDeck';
import { DashboardEmptyState } from '../../../components/DashboardEmptyState/DashboardEmptyState';
import { useFeatureContext } from '../../../context/FeatureContext';
import { FeatureFlag } from '../../../enums/FeatureFlag';
import { Gender } from '../../../enums/Gender';
import { useAgencyData } from '../../../hooks/useAgencyData';
import { useAgencyPostCodesData } from '../../../hooks/useAgencyPostCodesData';
import { useAgencyUpdate } from '../../../hooks/useAgencyUpdate';
import { convertToOptions } from '../../../utils/convertToOptions';
import { AgencySettings } from './components/AgencySettings';
import { AgencyGeneralInformation } from './components/GeneralInformation';
import { RegistrationSettings } from './components/RegistrationSettings';
import { CounsellingRelation } from '../../../enums/CounsellingRelation';
import { ReleaseToggle } from '../../../enums/ReleaseToggle';
import { useReleasesToggle } from '../../../hooks/useReleasesToggle.hook';
import { useAgencyLegalDataMissing } from '../../../hooks/useAgencyLegalDataMissing';
import { ResponsibleSettings } from './components/ResponsibleSettings';
import { ContactSettings } from './components/ContactSettings';
import { DataProcessingAgreementContainer } from '../../../components/Tenants/LegalSettings/components/DataProcessingAgreementContainer';
import { AgencyLegalTextContainer } from '../../../components/Tenants/LegalSettings/components/AgencyLegalTextContainer';
import styles from '../../../components/Page/styles.module.scss';
import { CardEditable } from '../../../components/CardEditable';
import { AgencyPermissionsSettings } from '../../../components/Tenants/AppSettings/PermissionsSettings/AgencyPermissionsSettings';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { useDpaGate } from '../../../hooks/useDpaGate.hook';
import { GoLiveStatus, GoLiveCondition } from '../../../components/GoLiveStatus';
import { useAgencyGoLiveConditions } from '../../../hooks/useAgencyGoLiveConditions';
import { trackGoLiveEvent } from '../../../utils/goLiveTracking';
import { AgencyCounsellingIcon } from '../../../components/CustomIcons/AgencyCounselling';
import { AllUsersIcon } from '../../../components/CustomIcons/AllUsers';
import { TopicInterestsIcon } from '../../../components/CustomIcons/TopicInterests';
import { parseAgencyFieldValidationError } from '../../../api/agency/agencyValidationError';

function hasOnlyDefaultRangeDefined(data: PostCodeRange[]) {
    return data?.length === 0 || (data?.length === 1 && data[0].from === '00000' && data[0].until === '99999');
}

const DEFAULT_MIN_AGE = 18;
const DEFAULT_MAX_AGE = 100;

type AgencySettingsSection = 'general' | 'legal' | 'functionalities';

interface AgencyPageEditProps {
    section?: AgencySettingsSection;
}

const getEntityId = (value: unknown) => {
    if (typeof value === 'number' || typeof value === 'string') {
        return String(value);
    }

    if (value && typeof value === 'object' && 'id' in value) {
        const { id } = value as { id?: unknown };
        return typeof id === 'number' || typeof id === 'string' ? String(id) : '';
    }

    return '';
};

export const AgencyPageEdit = ({ section = 'general' }: AgencyPageEditProps) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { id } = useParams();
    const isEditing = id !== 'add';
    const isLegalSection = section === 'legal';
    const isFunctionalitiesSection = section === 'functionalities';
    const [isReadOnly, setReadOnly] = useState(isEditing);
    const [submitted, setSubmitted] = useState(false);
    const { data: agencyData, isLoading, error: agencyError } = useAgencyData({ id });
    // 403 and 404 are surfaced identically here so a foreign agency's mere existence
    // isn't observable from the UI. Any other failure keeps rendering the (empty) page
    // as before, since fetchData's generic toast already told the user something broke.
    const isAgencyInaccessible = isEditing && !isLoading && agencyError instanceof AgencyAccessError;
    const { data: postCodes, isLoading: isLoadingPostCodes } = useAgencyPostCodesData({ id });
    const { isEnabled } = useFeatureContext();
    const { isEnabled: isReleaseToggleEnabled } = useReleasesToggle();
    const { isSuperAdmin, isTenantScopedAdmin, tenantId } = useUserRoles();
    const {
        data: dpaGate,
        isLoading: isDpaGateLoading,
        isError: isDpaGateError,
        refetch: refetchDpaGate,
    } = useDpaGate(tenantId ?? 0, !isEditing && isTenantScopedAdmin);
    const [form] = Form.useForm();
    const { mutate, isPending: isAgencySaving } = useAgencyUpdate(id);
    const legalDataMissing = useAgencyLegalDataMissing(agencyData);
    const agencyTenantId = getEntityId(agencyData?.tenantId);
    const goLive = useAgencyGoLiveConditions({ id, agencyData });
    const goLiveConditions: GoLiveCondition[] = (
        [
            { key: 'masterData', met: goLive.masterDataComplete },
            { key: 'departments', met: goLive.departmentsDefined },
            { key: 'team', met: goLive.hasTeam },
            { key: 'privacy', met: goLive.privacyPublished },
            { key: 'imprint', met: goLive.imprintPublished },
        ] as const
    ).map(({ key, met }) => ({ key, state: met ? 'met' : 'open', label: t(`agency.goLive.condition.${key}`) }));

    const onGoLiveToggle = useCallback(
        (next: boolean) => {
            // Narrow patch on purpose (see onSaveCard): only the offline flag moves.
            // Deactivating takes the Beratungsstelle offline for NEW requests only —
            // existing conversations in the app remain untouched by this flag.
            mutate(
                { offline: !next },
                {
                    onSuccess: () => {
                        trackGoLiveEvent({ scope: 'agency', id: Number(id), live: next });
                        notification.success({ message: t('message.agency.updated'), duration: 3 });
                    },
                },
            );
        },
        [id, mutate, t],
    );
    const agencySettingsTabs = isAgencyInaccessible
        ? []
        : [
              {
                  titleKey: 'settings.subhead.masterData',
                  to: `${routePathNames.agency}/${id}/general`,
                  iconName: 'master_data',
                  icon: legalDataMissing ? <ErrorOutlinedIcon color="error" /> : null,
              },
              isEditing && {
                  titleKey: 'settings.subhead.legal',
                  to: `${routePathNames.agency}/${id}/legal-settings`,
                  iconName: 'legal',
                  icon: legalDataMissing ? <ErrorOutlinedIcon color="error" /> : null,
              },
              isEditing && {
                  titleKey: 'settings.subhead.functionAccess',
                  to: `${routePathNames.agency}/${id}/functionalities`,
                  iconName: 'functionality_access',
              },
          ];
    const isAgencyCreationDpaBlocked =
        !isEditing && isTenantScopedAdmin && (isDpaGateLoading || isDpaGateError || dpaGate?.dpaSigned !== true);

    const demographicsInitialValues = isEnabled(FeatureFlag.Demographics)
        ? {
              demographics: {
                  age:
                      agencyData?.demographics?.ageFrom !== undefined
                          ? [agencyData.demographics.ageFrom, agencyData.demographics.ageTo]
                          : [DEFAULT_MIN_AGE, DEFAULT_MAX_AGE],
                  genders: (agencyData?.demographics?.genders || Object.values(Gender)).map((gender) => ({
                      value: gender,
                      label: t(`agency.gender.option.${gender.toLowerCase()}`),
                  })),
              },
          }
        : {};

    const counsellingRelationsInitialValues = isReleaseToggleEnabled(ReleaseToggle.COUNSELLING_RELATIONS)
        ? {
              counsellingRelations: (agencyData?.counsellingRelations || Object.values(CounsellingRelation)).map(
                  (relation) => ({
                      value: relation,
                      label: t(`agency.relation.option.${relation.replace('_COUNSELLING', '').toLowerCase()}`),
                  }),
              ),
          }
        : {};

    const initialValues = {
        ...agencyData,
        postCodes: postCodes?.length > 0 ? postCodes : [{ from: '00000', until: '99999' }],
        ...demographicsInitialValues,
        ...counsellingRelationsInitialValues,
        postCodeRangesActive: !hasOnlyDefaultRangeDefined(postCodes || []),
        online: agencyData?.id ? !agencyData?.offline : false,
        // ADR-014: load every department, not just the first. Taking [0] here was the entry point
        // of the data loss — the form then sent that single topic back and the backend deleted the
        // other agency_topic rows together with their published legal texts.
        topicIds: convertToOptions(agencyData?.topics, 'name', 'id', true),
        tenantId: agencyTenantId,
    };

    const buildAgencyUpdateData = useCallback(
        (formData) => {
            const mergedFormData = {
                ...initialValues,
                ...formData,
                dataProtection: {
                    ...initialValues.dataProtection,
                    ...formData.dataProtection,
                },
                content: {
                    ...initialValues.content,
                    ...formData.content,
                },
            };

            return {
                ...mergedFormData,
                demographics:
                    mergedFormData.demographics?.age !== undefined
                        ? {
                              ageFrom: mergedFormData.demographics.age[0],
                              ageTo: mergedFormData.demographics.age[1],
                              genders: mergedFormData.demographics.genders.map(({ value }) => value),
                          }
                        : mergedFormData.demographics,
                topicIds: normalizeTopicIds(mergedFormData.topicIds),
                offline: !mergedFormData.online,
                counsellingRelations: mergedFormData.counsellingRelations?.map(
                    (relation) => relation.value || relation,
                ),
                tenantId: parseInt(mergedFormData.tenantId, 10),
            };
        },
        [initialValues],
    );

    const onSubmit = useCallback(
        (formData) => {
            setSubmitted(true);

            const selectedTenantId = Number(formData?.tenantId);
            if (isSuperAdmin && (!Number.isFinite(selectedTenantId) || selectedTenantId <= 0)) {
                form.setFields([
                    {
                        name: 'tenantId',
                        errors: [t('form.errors.required')],
                    },
                ]);
                notification.error({
                    message: t('agency.edit.general.more_settings.tenant.title'),
                    description: t('form.errors.required'),
                    duration: 5,
                });
                setSubmitted(false);
                return;
            }

            mutate(buildAgencyUpdateData(formData), {
                onError: () => {
                    setSubmitted(false);
                },
                onSuccess: (response) => {
                    navigate(routePathNames.agency);

                    notification.success({
                        message: t(`message.agency.${isEditing ? 'updated' : 'add'}`),
                        duration: 3,
                    });
                    if (response?.consultantAssignmentFailed) {
                        notification.warning({
                            message: t('message.agency.consultantAssignmentFailed'),
                            duration: 8,
                        });
                    }
                    setSubmitted(false);
                    setReadOnly(true);
                },
            });
        },
        [buildAgencyUpdateData, form, isEditing, isSuperAdmin, mutate, navigate, t],
    );

    const onSaveCard = useCallback(
        (formData, options?: { onError?: () => void; form?: ReturnType<typeof Form.useForm>[0] }) => {
            // Card forms deliberately submit only their own nested fields. Passing a
            // full snapshot here lets a fast follow-up card save re-send stale nulls
            // before the invalidated agency query has completed, wiping the previous
            // card. useAgencyUpdate merges this narrow patch into its latest cache.
            mutate(formData, {
                onError: async (error) => {
                    options?.onError?.();
                    const validationError = await parseAgencyFieldValidationError(error);
                    if (validationError && options?.form) {
                        const message = t(validationError.translationKey);
                        options.form.setFields([{ name: validationError.fieldName, errors: [message] }]);
                        options.form.scrollToField(validationError.fieldName, { focus: true });
                        return;
                    }

                    if (error instanceof Response && error.status === 400) {
                        notification.error({
                            message: t('message.error.default'),
                            duration: 8,
                        });
                    }
                },
                onSuccess: () => {
                    notification.success({
                        message: t(`message.agency.${isEditing ? 'updated' : 'add'}`),
                        duration: 3,
                    });
                },
            });
        },
        [isEditing, mutate, t],
    );

    const onCancel = useCallback(() => {
        if (isEditing) {
            form.resetFields();
            setReadOnly(true);
        } else {
            navigate(routePathNames.agency);
        }
    }, [form, isEditing, navigate]);

    const renderGeneralSettings = () => {
        if (isEditing) {
            return (
                <ThemeProvider theme={orisoMuiTheme}>
                    {/* Topmost, and deliberately a SECTION, not a card: the go-live
                        state scopes the whole Beratungsstelle. The former redundant
                        "Allgemeines" headline (it repeated the active tab) is gone. */}
                    <GoLiveStatus
                        title={t('agency.goLive.title')}
                        description={t('agency.goLive.description')}
                        conditions={goLiveConditions}
                        isLoading={goLive.isLoading}
                        switchControl={{
                            checked: !agencyData?.offline,
                            label: t('agency.goLive.switchLabel'),
                            disabledHint: t('agency.goLive.switchHint'),
                            onChange: onGoLiveToggle,
                        }}
                    />
                    <CardDeck
                        ariaLabel={t(`agency.edit.settings.general.title`)}
                        previousLabel={t('agency.cardDeck.previous')}
                        nextLabel={t('agency.cardDeck.next')}
                    >
                        <CardDeck.Item>
                            <CardEditable
                                allowUnsavedChanges
                                initialValues={initialValues}
                                titleKey="agency.edit.general.general_information"
                                subTitleKey="agency.edit.general.general_information.purpose"
                                headerIcon={<AgencyCounsellingIcon />}
                                variant="dialog"
                                editButtonPlacement="footer"
                                onSave={onSaveCard}
                            >
                                <AgencyGeneralInformation asFields />
                            </CardEditable>
                        </CardDeck.Item>
                        <CardDeck.Item>
                            <CardEditable
                                allowUnsavedChanges
                                initialValues={initialValues}
                                titleKey="agency.form.registrationSettings.title"
                                subTitleKey="agency.form.registrationSettings.purpose"
                                headerIcon={<AllUsersIcon />}
                                variant="dialog"
                                editButtonPlacement="footer"
                                onSave={onSaveCard}
                            >
                                {({ editing }) => <RegistrationSettings asFields editing={editing} />}
                            </CardEditable>
                        </CardDeck.Item>
                        <CardDeck.Item>
                            <CardEditable
                                allowUnsavedChanges
                                initialValues={initialValues}
                                titleKey="agency.edit.settings.title"
                                subTitleKey="agency.edit.settings.purpose"
                                headerIcon={<TopicInterestsIcon />}
                                variant="dialog"
                                editButtonPlacement="footer"
                                onSave={onSaveCard}
                            >
                                <AgencySettings isEditMode={isEditing} asFields />
                            </CardEditable>
                        </CardDeck.Item>
                    </CardDeck>
                </ThemeProvider>
            );
        }

        return (
            <ThemeProvider theme={orisoMuiTheme}>
                <Form
                    initialValues={initialValues}
                    labelAlign="left"
                    labelWrap
                    layout="vertical"
                    form={form}
                    size="large"
                    disabled={isReadOnly}
                    onFinish={onSubmit}
                >
                    {/* Create flow: the same condition chain, shown from the first
                        second so the path to "live" is never a surprise. The switch
                        itself only exists once the Beratungsstelle is persisted. */}
                    <GoLiveStatus
                        title={t('agency.goLive.title')}
                        description={`${t('agency.goLive.description')} ${t('agency.goLive.createHint')}`}
                        conditions={goLiveConditions}
                    />
                    <CardDeck
                        ariaLabel={t(`agency.edit.settings.general.title`)}
                        previousLabel={t('agency.cardDeck.previous')}
                        nextLabel={t('agency.cardDeck.next')}
                    >
                        <CardDeck.Item>
                            <AgencyGeneralInformation />
                            <RegistrationSettings />
                        </CardDeck.Item>
                        <CardDeck.Item>
                            <AgencySettings isEditMode={isEditing} />
                        </CardDeck.Item>
                    </CardDeck>
                </Form>
            </ThemeProvider>
        );
    };

    const renderFunctionalitiesSettings = () => (
        <>
            <h3 className={styles.backHeadline}>{t('settings.subhead.functionAccess')}</h3>
            {/* Agency-scoped toggles (the agency's own settings JSON) — not the tenant's. */}
            <AgencyPermissionsSettings agencyId={id} />
        </>
    );

    const renderLegacyFunctionalitiesSettings = () => (
        <Form
            initialValues={initialValues}
            labelAlign="left"
            labelWrap
            layout="vertical"
            form={form}
            size="large"
            disabled={isReadOnly}
            onFinish={onSubmit}
        >
            <h3 className={styles.backHeadline}>{t('agency.edit.settings.functionalities.title')}</h3>
            <CardDeck
                ariaLabel={t('agency.edit.settings.functionalities.title')}
                previousLabel={t('agency.cardDeck.previous')}
                nextLabel={t('agency.cardDeck.next')}
            >
                <CardDeck.Item>
                    <AgencySettings isEditMode={isEditing} />
                </CardDeck.Item>
            </CardDeck>
        </Form>
    );

    const renderLegalSettings = () => (
        <>
            {/* The "Rechtliches" headline repeated the active tab (feedback
                2026-08-19); the legal-data-missing marker lives on the tab icon. */}
            <CardDeck
                ariaLabel={t(`agency.edit.settings.legal.title`)}
                previousLabel={t('legal.cardDeck.previous')}
                nextLabel={t('legal.cardDeck.next')}
            >
                <CardDeck.Item>
                    <ResponsibleSettings initialValues={initialValues} onSave={onSaveCard} />
                </CardDeck.Item>
                <CardDeck.Item>
                    <ContactSettings initialValues={initialValues} onSave={onSaveCard} />
                </CardDeck.Item>
                <CardDeck.Item className={styles.cardDeckItem}>
                    {/* The DPA is managed at tenant (Träger) level — agency admins get a read-only view. */}
                    <DataProcessingAgreementContainer tenantId={agencyTenantId} readOnly />
                </CardDeck.Item>
                <CardDeck.Item className={styles.cardDeckItem}>
                    {/* ADR-014: one editor per legal-text kind for the whole Beratungsstelle; the
                        Fachbereich is chosen in the editor's lower function bar (Figma 1261:52149),
                        with "Alle Fachbereiche" editing the inheritable agency-wide text. */}
                    <AgencyLegalTextContainer
                        agencyData={agencyData}
                        field="imprint"
                        onSaveAgencyWide={onSaveCard}
                        saving={isAgencySaving}
                    />
                </CardDeck.Item>
                <CardDeck.Item className={styles.cardDeckItem}>
                    <AgencyLegalTextContainer
                        agencyData={agencyData}
                        field="privacy"
                        onSaveAgencyWide={onSaveCard}
                        saving={isAgencySaving}
                    />
                </CardDeck.Item>
            </CardDeck>
        </>
    );

    const renderPageBody = () => (
        <>
            {isLegalSection && renderLegalSettings()}
            {isFunctionalitiesSection &&
                (isEditing ? renderFunctionalitiesSettings() : renderLegacyFunctionalitiesSettings())}
            {!isLegalSection && !isFunctionalitiesSection && renderGeneralSettings()}
        </>
    );

    let agencyContent;
    if (isAgencyInaccessible) {
        agencyContent = (
            <DashboardEmptyState
                icon={<ErrorOutlinedIcon fontSize="large" />}
                title={t('agency.edit.notFound.title')}
                description={t('agency.edit.notFound.description')}
                action={{
                    label: t('agency.edit.notFound.backToOverview'),
                    onClick: () => navigate(routePathNames.agency),
                }}
            />
        );
    } else if (isAgencyCreationDpaBlocked) {
        agencyContent = (
            <Alert
                type="warning"
                showIcon
                message={t('agency.dpaGate.title')}
                description={t('agency.dpaGate.description')}
                action={
                    isDpaGateError ? (
                        <Button size="small" onClick={() => refetchDpaGate()}>
                            {t('tenants.legal.version.retry')}
                        </Button>
                    ) : (
                        <Button size="small" onClick={() => navigate(`${routePathNames.themeSettings}/legal`)}>
                            {t('agency.dpaGate.openLegalSettings')}
                        </Button>
                    )
                }
            />
        );
    } else {
        agencyContent = renderPageBody();
    }

    return (
        <Page isLoading={isLoading || isLoadingPostCodes} stickyHeader>
            <Page.BackWithActions
                path={routePathNames.agency}
                title={
                    isEditing
                        ? agencyData?.name || t<string>('agency.edit.general.headline')
                        : t<string>('agency.edit.general.headline')
                }
                titleMaxLength={isEditing ? 10 : undefined}
                tabs={agencySettingsTabs}
            >
                {!isAgencyInaccessible &&
                    !isAgencyCreationDpaBlocked &&
                    isReadOnly &&
                    !isEditing &&
                    !isLegalSection && (
                        <Button type="text" className="admin-m3-text-button" onClick={() => setReadOnly(false)}>
                            {t('edit')}
                        </Button>
                    )}
                {!isAgencyInaccessible &&
                    !isAgencyCreationDpaBlocked &&
                    !isReadOnly &&
                    !isEditing &&
                    !isLegalSection && (
                        <>
                            <Button type="text" className="admin-m3-text-button" onClick={onCancel}>
                                {t('btn.cancel')}
                            </Button>
                            <Button
                                type="text"
                                className="admin-m3-text-button"
                                onClick={() => form.submit()}
                                disabled={submitted}
                            >
                                {t('save')}
                            </Button>
                        </>
                    )}
            </Page.BackWithActions>
            {agencyContent}
        </Page>
    );
};
