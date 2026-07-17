import { Button, Col, Form, notification, Row } from 'antd';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { PostCodeRange } from '../../../api/agency/getAgencyPostCodeRange';
import { normalizeTopicIds } from '../../../api/agency/normalizeTopicIds';
import routePathNames from '../../../appConfig';
import { Page } from '../../../components/Page';
import { CardDeck } from '../../../components/CardDeck';
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
import { LegalTextSettings } from './components/LegalTextSettings';
import { DataProcessingAgreementContainer } from '../../../components/Tenants/LegalSettings/components/DataProcessingAgreementContainer';
import { DepartmentDataProtectionContainer } from '../../../components/Tenants/LegalSettings/components/DepartmentDataProtectionContainer';
import styles from '../../../components/Page/styles.module.scss';
import { CardEditable } from '../../../components/CardEditable';
import { PermissionsSettings } from '../../../components/Tenants/AppSettings/PermissionsSettings';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';

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
    const { data: agencyData, isLoading } = useAgencyData({ id });
    const { data: postCodes, isLoading: isLoadingPostCodes } = useAgencyPostCodesData({ id });
    const { isEnabled } = useFeatureContext();
    const { isEnabled: isReleaseToggleEnabled } = useReleasesToggle();
    const { isSuperAdmin } = useUserRoles();
    const [form] = Form.useForm();
    const { mutate } = useAgencyUpdate(id);
    const legalDataMissing = useAgencyLegalDataMissing(agencyData);
    const agencyTenantId = getEntityId(agencyData?.tenantId);
    const agencySettingsTabs = [
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
        topicIds: convertToOptions(agencyData?.topics, 'name', 'id', true)[0],
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
        (formData, options?: { onError?: () => void }) => {
            mutate(buildAgencyUpdateData(formData), {
                onError: () => {
                    options?.onError?.();
                },
                onSuccess: () => {
                    notification.success({
                        message: t(`message.agency.${isEditing ? 'updated' : 'add'}`),
                        duration: 3,
                    });
                },
            });
        },
        [buildAgencyUpdateData, isEditing, mutate, t],
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
                    <h3 className={styles.backHeadline}>{t(`agency.edit.settings.general.title`)}</h3>
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
                                variant="dialog"
                                editButtonPlacement="footer"
                                onSave={onSaveCard}
                            >
                                <RegistrationSettings asFields />
                            </CardEditable>
                        </CardDeck.Item>
                        <CardDeck.Item>
                            <CardEditable
                                allowUnsavedChanges
                                initialValues={initialValues}
                                titleKey="agency.edit.settings.title"
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
                    <Row gutter={[20, 10]}>
                        <Col xs={24}>
                            <h3 className={styles.backHeadline}>{t(`agency.edit.settings.general.title`)}</h3>
                        </Col>
                        <Col xs={24} lg={12}>
                            <AgencyGeneralInformation />
                            <RegistrationSettings />
                        </Col>
                        <Col xs={24} lg={12}>
                            <AgencySettings isEditMode={isEditing} />
                        </Col>
                    </Row>
                </Form>
            </ThemeProvider>
        );
    };

    const renderFunctionalitiesSettings = () => (
        <>
            <h3 className={styles.backHeadline}>{t('settings.subhead.functionAccess')}</h3>
            {agencyTenantId ? <PermissionsSettings tenantId={agencyTenantId} /> : null}
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
            <Row gutter={[20, 10]}>
                <Col xs={24}>
                    <h3 className={styles.backHeadline}>{t('agency.edit.settings.functionalities.title')}</h3>
                </Col>
                <Col xs={24} lg={12}>
                    <AgencySettings isEditMode={isEditing} />
                </Col>
            </Row>
        </Form>
    );

    const renderLegalSettings = () => (
        <>
            <h3 className={styles.backHeadline}>
                {t(`agency.edit.settings.legal.title`)}{' '}
                {legalDataMissing && <ErrorOutlinedIcon fontSize="small" color="error" />}
            </h3>
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
                <CardDeck.Item>
                    <LegalTextSettings
                        agencyData={agencyData}
                        field="impressum"
                        initialValues={initialValues}
                        onSave={onSaveCard}
                    />
                </CardDeck.Item>
                <CardDeck.Item>
                    <LegalTextSettings
                        agencyData={agencyData}
                        field="privacy"
                        initialValues={initialValues}
                        onSave={onSaveCard}
                    />
                </CardDeck.Item>
                <CardDeck.Item>
                    {/* The DPA is managed at tenant (Träger) level — agency admins get a read-only view. */}
                    <DataProcessingAgreementContainer tenantId={agencyTenantId} readOnly />
                </CardDeck.Item>
                {agencyData?.id &&
                    (agencyData.topics || [])
                        .filter((topic) => topic.id != null)
                        .map((topic) => (
                            <CardDeck.Item key={`dpp-${topic.id}`}>
                                <DepartmentDataProtectionContainer
                                    agencyId={Number(agencyData.id)}
                                    topicId={topic.id as number}
                                    departmentName={topic.name}
                                />
                            </CardDeck.Item>
                        ))}
            </CardDeck>
        </>
    );

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
                {isReadOnly && !isEditing && !isLegalSection && (
                    <Button type="primary" onClick={() => setReadOnly(false)}>
                        {t('edit')}
                    </Button>
                )}
                {!isReadOnly && !isEditing && !isLegalSection && (
                    <>
                        <Button type="default" onClick={onCancel}>
                            {t('btn.cancel')}
                        </Button>
                        <Button type="primary" onClick={() => form.submit()} disabled={submitted}>
                            {t('save')}
                        </Button>
                    </>
                )}
            </Page.BackWithActions>
            {isLegalSection && renderLegalSettings()}
            {isFunctionalitiesSection &&
                (isEditing ? renderFunctionalitiesSettings() : renderLegacyFunctionalitiesSettings())}
            {!isLegalSection && !isFunctionalitiesSection && renderGeneralSettings()}
        </Page>
    );
};
