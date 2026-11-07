import { Alert, Button, Form, notification } from 'antd';
import { ReactElement, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined';
import PrivacyTipOutlinedIcon from '@mui/icons-material/PrivacyTipOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { ThemeProvider } from '@mui/material/styles';
import { GdprIcon, ImprintIcon } from '../../../components/CustomIcons/LegalIcons';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { AgencyAccessError } from '../../../api/agency/getAgencyById';
import { PostCodeRange } from '../../../api/agency/getAgencyPostCodeRange';
import { normalizeTopicIds } from '../../../api/agency/normalizeTopicIds';
import routePathNames from '../../../appConfig';
import { Page } from '../../../components/Page';
import { CardGrid } from '../../../components/CardGrid';
import { DashboardEmptyState } from '../../../components/DashboardEmptyState/DashboardEmptyState';
import { useFeatureContext } from '../../../context/FeatureContext';
import { FeatureFlag } from '../../../enums/FeatureFlag';
import { Gender } from '../../../enums/Gender';
import { useAgencyData } from '../../../hooks/useAgencyData';
import { useAgencyPostCodesData } from '../../../hooks/useAgencyPostCodesData';
import { useAgencyUpdate } from '../../../hooks/useAgencyUpdate';
import { useTenantTopics } from '../../../hooks/useTenantTopics';
import { convertToOptions } from '../../../utils/convertToOptions';
import { AgencySettings } from './components/AgencySettings';
import { AgencyDepartmentDetails } from './components/DepartmentDetails';
import { AgencyGeneralInformation } from './components/GeneralInformation';
import { RegistrationSettings } from './components/RegistrationSettings';
import { NoTopicConfirmModal } from './components/NoTopicConfirm';
import { AgencyMasterDataTile } from './components/MasterDataTile';
import { AgencyTileGrid, type AgencyTile, type AgencyTileLayout } from './AgencyTileGrid';
import {
    contractDocumentsTileStatus,
    dataProtectionContactTileStatus,
    imprintTileStatus,
    privacyTileStatus,
    responsibleTileStatus,
    type LegalTileStatus,
} from './agencyLegalTileStatus';
import { CounsellingRelation } from '../../../enums/CounsellingRelation';
import { ReleaseToggle } from '../../../enums/ReleaseToggle';
import { useReleasesToggle } from '../../../hooks/useReleasesToggle.hook';
import { useAgencyLegalDataMissing } from '../../../hooks/useAgencyLegalDataMissing';
import { useTraegerDataProtectionOfficer } from '../../../hooks/useTraegerDataProtectionOfficer';
import { ResponsibleSettings } from './components/ResponsibleSettings';
import { ContactSettings } from './components/ContactSettings';
import { DataProcessingAgreementContainer } from '../../../components/Tenants/LegalSettings/components/DataProcessingAgreementContainer';
import { AgencyLegalTextWithTemplates } from '../../../components/Tenants/LegalSettings/components/AgencyLegalTextContainer/AgencyLegalTextWithTemplates';
import { LegalTemplateUnreadMarker } from '../../../components/Tenants/LegalSettings/components/LegalTemplateCompare/LegalTemplateUnreadMarker';
import { useHasUnreadLegalProposals } from '../../../components/Tenants/LegalSettings/hooks/useLegalProposalInbox';
import pageStyles from '../../../components/Page/styles.module.scss';
import { AgencyPermissionsSettings } from '../../../components/Tenants/AppSettings/PermissionsSettings/AgencyPermissionsSettings';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { LiveChatLinks } from '../../../components/LiveChatLinks';
import { resolveAgencyLiveChatLinksAccess } from '../../../constants/liveChatLinksAccess';
import { useDpaGate } from '../../../hooks/useDpaGate.hook';
import { canStartNewCounselling } from '../../../utils/dpaBlockerGate';
import { isFieldMounted, parseAgencyFieldValidationError } from '../../../api/agency/agencyValidationError';
import type { AgencyData } from '../../../types/agency';
import { describeAgencyValidationErrors, ValidationErrorField } from './agencyValidationFeedback';

function hasOnlyDefaultRangeDefined(data: PostCodeRange[]) {
    return data?.length === 0 || (data?.length === 1 && data[0].from === '00000' && data[0].until === '99999');
}

const DEFAULT_MIN_AGE = 18;
const DEFAULT_MAX_AGE = 100;

type AgencySettingsSection = 'general' | 'legal' | 'functionalities';

interface AgencyPageEditProps {
    section?: AgencySettingsSection;
    /**
     * How the Rechtliches tab lays out its tiles. `raster` gives the document tiles the whole row;
     * `collapsible` folds every tile up to its header, the first one open.
     */
    legalLayout?: AgencyTileLayout;
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

export const AgencyPageEdit = ({ section = 'general', legalLayout = 'raster' }: AgencyPageEditProps) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { id } = useParams();
    const isEditing = id !== 'add';
    const isLegalSection = section === 'legal';
    const isFunctionalitiesSection = section === 'functionalities';
    const [isReadOnly, setReadOnly] = useState(isEditing);
    const [submitted, setSubmitted] = useState(false);
    const [pendingNoTopicForm, setPendingNoTopicForm] = useState<Record<string, unknown> | null>(null);
    const [departmentFieldRequest, setDepartmentFieldRequest] = useState(0);
    const [pendingCardSave, setPendingCardSave] = useState<{
        formData: Record<string, unknown>;
        options?: { onError?: () => void; form?: ReturnType<typeof Form.useForm>[0] };
    } | null>(null);
    const { data: agencyData, isLoading, error: agencyError } = useAgencyData({ id });
    // 403 and 404 are surfaced identically here so a foreign agency's mere existence
    // isn't observable from the UI. Any other failure keeps rendering the (empty) page
    // as before, since fetchData's generic toast already told the user something broke.
    const isAgencyInaccessible = isEditing && !isLoading && agencyError instanceof AgencyAccessError;
    const { data: postCodes, isLoading: isLoadingPostCodes } = useAgencyPostCodesData({ id });
    const { isEnabled } = useFeatureContext();
    const { isEnabled: isReleaseToggleEnabled } = useReleasesToggle();
    const { isSuperAdmin, isTenantScopedAdmin, tenantId, hasRole } = useUserRoles();
    const showLiveChatLinks =
        resolveAgencyLiveChatLinksAccess({ isSuperAdmin, isTenantScopedAdmin, hasRole }) === 'read';
    const {
        data: dpaGate,
        isLoading: isDpaGateLoading,
        isError: isDpaGateError,
        refetch: refetchDpaGate,
    } = useDpaGate(tenantId ?? 0, !isEditing && isTenantScopedAdmin);
    const [form] = Form.useForm();
    const { mutate, mutateAsync, isPending: isAgencySaving } = useAgencyUpdate(id);
    const { data: tenantTopics } = useTenantTopics(true);
    const legalDataMissing = useAgencyLegalDataMissing(agencyData);
    const hasNewLegalTemplate = useHasUnreadLegalProposals('agency', id, isEditing && !isAgencyInaccessible);
    let legalTabIcon: ReactElement | null = null;
    if (legalDataMissing) legalTabIcon = <ErrorOutlinedIcon color="error" />;
    else if (hasNewLegalTemplate) legalTabIcon = <LegalTemplateUnreadMarker />;
    const agencyTenantId = getEntityId(agencyData?.tenantId);
    const { data: traegerDpo } = useTraegerDataProtectionOfficer(agencyTenantId);
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
                  icon: legalTabIcon,
              },
              isEditing && {
                  titleKey: 'settings.subhead.functionAccess',
                  to: `${routePathNames.agency}/${id}/functionalities`,
                  iconName: 'functionality_access',
              },
          ];
    const isAgencyCreationDpaBlocked =
        !isEditing && isTenantScopedAdmin && (isDpaGateLoading || isDpaGateError || !canStartNewCounselling(dpaGate));

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
        teamAgency: Boolean(agencyData?.teamAgency),
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

    const persistAgency = useCallback(
        (formData) => {
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
        [buildAgencyUpdateData, isEditing, mutate, navigate, t],
    );

    /**
     * antd stops at its own validation and never reaches `onSubmit`, so the
     * tenant notification above cannot fire for an empty required field. The
     * agency form is taller than the viewport and its required fields sit in
     * three different cards: submitting from the top looked like the Save
     * button did nothing at all. Say what is missing and scroll to it.
     */
    const onValidationFailed = useCallback(
        ({ errorFields }: { errorFields?: ValidationErrorField[] }) => {
            const fields = describeAgencyValidationErrors(errorFields, t);

            notification.error({
                message: t('agency.edit.form.validationFailed'),
                description: fields || t('form.errors.required'),
                duration: 8,
            });
        },
        [t],
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

            const isActivatingCounselling =
                formData.online === true && (!agencyData?.id || initialValues.online === false);
            const tenantOffersTopics = (tenantTopics?.length ?? 0) > 0;
            if (isActivatingCounselling && tenantOffersTopics && normalizeTopicIds(formData.topicIds).length === 0) {
                setPendingNoTopicForm(formData);
                return;
            }

            persistAgency(formData);
        },
        [agencyData?.id, form, initialValues.online, isSuperAdmin, persistAgency, t, tenantTopics?.length],
    );

    const persistCard = useCallback(
        (formData, options?: { onError?: () => void; form?: ReturnType<typeof Form.useForm>[0] }) => {
            // Card forms deliberately submit only their own nested fields. Passing a
            // full snapshot here lets a fast follow-up card save re-send stale nulls
            // before the invalidated agency query has completed, wiping the previous
            // card. useAgencyUpdate merges this narrow patch into its latest cache.
            mutate(formData, {
                onError: async (error) => {
                    options?.onError?.();
                    const validationError = await parseAgencyFieldValidationError(error);
                    if (validationError) {
                        const message = t(validationError.translationKey);
                        if (options?.form && isFieldMounted(options.form, validationError.fieldName)) {
                            options.form.setFields([{ name: validationError.fieldName, errors: [message] }]);
                            options.form.scrollToField(validationError.fieldName, { focus: true });
                            return;
                        }
                        // The field lives on another card (the visibility switch is rejected for
                        // an incomplete data protection contact): say what is missing instead.
                        notification.error({ message, duration: 8 });
                        return;
                    }

                    if (error instanceof Response && error.status === 400) {
                        notification.error({
                            message: t('message.error.default'),
                            duration: 8,
                        });
                    }
                },
                onSuccess: (response) => {
                    notification.success({
                        message: t(`message.agency.${isEditing ? 'updated' : 'add'}`),
                        duration: 3,
                    });
                    // A card save can assign counsellors too, so the same warning
                    // persistAgency shows belongs here. Without it the card reports
                    // success while the counsellor silently stayed unassigned.
                    if (response?.consultantAssignmentFailed) {
                        notification.warning({
                            message: t('message.agency.consultantAssignmentFailed'),
                            duration: 8,
                        });
                    }
                },
            });
        },
        [isEditing, mutate, t],
    );

    const confirmNoTopicActivation = useCallback(() => {
        if (pendingCardSave) {
            const pending = pendingCardSave;
            setPendingCardSave(null);
            persistCard(pending.formData, pending.options);
            return;
        }

        const formData = pendingNoTopicForm;
        setPendingNoTopicForm(null);
        if (formData) {
            persistAgency(formData);
        }
    }, [pendingCardSave, pendingNoTopicForm, persistAgency, persistCard]);

    const cancelNoTopicActivation = useCallback(() => {
        if (pendingCardSave) {
            pendingCardSave.options?.onError?.();
            setPendingCardSave(null);
            return;
        }

        setPendingNoTopicForm(null);
        setSubmitted(false);
    }, [pendingCardSave]);

    const onSaveCard = useCallback(
        (formData, options?: { onError?: () => void; form?: ReturnType<typeof Form.useForm>[0] }) => {
            const isActivatingCounselling = formData.online === true && initialValues.online === false;
            const tenantOffersTopics = (tenantTopics?.length ?? 0) > 0;
            if (
                isActivatingCounselling &&
                tenantOffersTopics &&
                normalizeTopicIds(formData.topicIds ?? initialValues.topicIds).length === 0
            ) {
                setPendingCardSave({ formData, options });
                return;
            }

            persistCard(formData, options);
        },
        [initialValues.online, initialValues.topicIds, persistCard, tenantTopics?.length],
    );

    // The agency legal-draft flow must know whether publication really completed before
    // deleting the exact saved revision. Mutation callbacks are intentionally unsuitable
    // for that transaction: they can be skipped after an unmount, while mutateAsync gives
    // the caller one settled promise for the backend write.
    const onSaveAgencyWide = useCallback(
        async <T,>(formData: T) => {
            try {
                await mutateAsync(formData as Partial<AgencyData>);
                notification.success({
                    message: t(`message.agency.${isEditing ? 'updated' : 'add'}`),
                    duration: 3,
                });
            } catch (error) {
                if (error instanceof Response && error.status === 400) {
                    notification.error({
                        message: t('message.error.default'),
                        duration: 8,
                    });
                }
                throw error;
            }
        },
        [isEditing, mutateAsync, t],
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
            // The order of the tiles on this tab. Moving a setting to another tile is a one-line change here.
            const masterDataTiles: AgencyTile[] = [
                {
                    id: 'master-data',
                    span: 3,
                    node: (
                        <AgencyMasterDataTile
                            initialValues={initialValues}
                            onSave={onSaveCard}
                            departmentFieldRequest={departmentFieldRequest}
                            persistedTeamAgency={initialValues.teamAgency}
                        />
                    ),
                },
                {
                    id: 'department-details',
                    node: (
                        <AgencyDepartmentDetails
                            agencyData={agencyData}
                            // The Fachbereich field only renders when the tenant offers topics.
                            onAddDepartment={
                                tenantTopics?.length > 0
                                    ? () => setDepartmentFieldRequest((request) => request + 1)
                                    : undefined
                            }
                        />
                    ),
                },
            ];

            return (
                <ThemeProvider theme={orisoMuiTheme}>
                    <AgencyTileGrid tiles={masterDataTiles} />
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
                    onFinishFailed={onValidationFailed}
                    scrollToFirstError={{ behavior: 'smooth', block: 'center' }}
                >
                    <h3 className={pageStyles.backHeadline}>{t(`agency.edit.settings.general.title`)}</h3>
                    {/* #620: the create flow shares the row width responsively (CardGrid)
                        instead of the fixed-width horizontal CardDeck — cards split 50/50
                        while two fit and stack below the floor, so FieldGrid can reach
                        its multi-column layout inside each card. */}
                    <CardGrid minCardWidth={425} maxColumns={2}>
                        <AgencyGeneralInformation />
                        <RegistrationSettings />
                        <AgencySettings isEditMode={isEditing} persistedTeamAgency={initialValues.teamAgency} />
                    </CardGrid>
                </Form>
            </ThemeProvider>
        );
    };

    const renderFunctionalitiesSettings = () => (
        <>
            {/* Agency-scoped toggles (the agency's own settings JSON) — not the tenant's. */}
            <AgencyPermissionsSettings
                agencyId={id}
                liveChatLinks={showLiveChatLinks ? <LiveChatLinks mode="read" /> : undefined}
            />
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
            onFinishFailed={onValidationFailed}
            scrollToFirstError={{ behavior: 'smooth', block: 'center' }}
        >
            <h3 className={pageStyles.backHeadline}>{t('agency.edit.settings.functionalities.title')}</h3>
            {/* #620: a single card in a fixed 392px deck rendered needlessly narrow —
                the grid lets it use the row up to the shared card floor. */}
            <CardGrid minCardWidth={425} maxColumns={2}>
                <AgencySettings isEditMode={isEditing} persistedTeamAgency={initialValues.teamAgency} />
            </CardGrid>
        </Form>
    );

    const renderLegalSettings = () => {
        // The order of the tiles on this tab. Moving a setting to another tile is a one-line change here.
        const summary = (icon: ReactElement, titleKey: string, status: LegalTileStatus) => ({
            icon,
            title: t(titleKey),
            status: t(status.key),
            statusTone: status.tone,
        });
        const legalTiles: AgencyTile[] = [
            {
                id: 'responsible',
                summary: summary(
                    <BusinessCenterOutlinedIcon />,
                    'agency.edit.settings.legal.responsible.title',
                    responsibleTileStatus(agencyData),
                ),
                node: <ResponsibleSettings initialValues={initialValues} onSave={onSaveCard} />,
            },
            {
                id: 'data-protection-contact',
                summary: summary(
                    <PrivacyTipOutlinedIcon />,
                    'agency.edit.settings.legal.contact.title',
                    dataProtectionContactTileStatus(agencyData, traegerDpo),
                ),
                node: <ContactSettings initialValues={initialValues} onSave={onSaveCard} traegerDpo={traegerDpo} />,
            },
            {
                id: 'contract-documents',
                summary: summary(
                    <DescriptionOutlinedIcon />,
                    'tenants.legal.dataProcessingAgreement.title',
                    contractDocumentsTileStatus(),
                ),
                document: true,
                span: 3,
                // The DPA is managed at tenant (Träger) level — agency admins get a read-only view.
                node: <DataProcessingAgreementContainer tenantId={agencyTenantId} readOnly />,
            },
            {
                id: 'imprint',
                summary: summary(<ImprintIcon />, 'tenants.legal.agencyImprint.title', imprintTileStatus(agencyData)),
                document: true,
                span: 3,
                /* ADR-014: one editor per legal-text kind for the whole Beratungsstelle; the
                   Fachbereich is chosen in the editor's lower function bar (Figma 1261:52149),
                   with "Alle Fachbereiche" editing the inheritable agency-wide text. */
                node: (
                    <AgencyLegalTextWithTemplates
                        agencyData={agencyData}
                        field="imprint"
                        onSaveAgencyWide={onSaveAgencyWide}
                        saving={isAgencySaving}
                    />
                ),
            },
            {
                id: 'privacy',
                summary: summary(
                    <GdprIcon />,
                    'tenants.legal.agencyDataProtection.title',
                    privacyTileStatus(agencyData),
                ),
                document: true,
                span: 3,
                node: (
                    <AgencyLegalTextWithTemplates
                        agencyData={agencyData}
                        field="privacy"
                        onSaveAgencyWide={onSaveAgencyWide}
                        saving={isAgencySaving}
                    />
                ),
            },
        ];

        return <AgencyTileGrid tiles={legalTiles} layout={legalLayout} />;
    };

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
            {(pendingNoTopicForm || pendingCardSave) && (
                <NoTopicConfirmModal onConfirm={confirmNoTopicActivation} onClose={cancelNoTopicActivation} />
            )}
        </Page>
    );
};
