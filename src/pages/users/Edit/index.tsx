import { Alert, Button, message, Space, Col, Row, Form } from 'antd';
import { useWatch } from 'antd/lib/form/Form';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { FETCH_ERRORS, X_REASON } from '../../../api/fetchData';
import { passwordFormRules, usernameFormRules } from '../../../utils/consultantCredentialRules';
import { Card } from '../../../components/Card';
import { MuiFormField, MuiMultilineFormField, MuiPasswordFormField } from '../../../components/mui/MuiFormField';
import { MuiSwitchField } from '../../../components/mui/MuiSwitchField';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { Page } from '../../../components/Page';
import { MuiSelectField, Option } from '../../../components/mui/MuiSelectField';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { TypeOfUser } from '../../../enums/TypeOfUser';
import { useAddOrUpdateConsultantOrAdmin } from '../../../hooks/useAddOrUpdateConsultantOrAgencyAdmin';
import { useAgenciesData } from '../../../hooks/useAgencysData';
import { useConsultantsOrAdminsData } from '../../../hooks/useConsultantsOrAdminsData';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { convertToOptions } from '../../../utils/convertToOptions';
import { decodeUsername } from '../../../utils/encryptionHelpers';
import styles from './styles.module.scss';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { UserRole } from '../../../enums/UserRole';
import { parseUserAuthInfo } from '../../../utils/parseUserAuthInfo';
import { searchTenantData } from '../../../api/tenant/searchTenantData';
import { getSingleTenantData } from '../../../api/tenant/getSingleTenantData';
import { extractApiErrorMessage } from '../../../utils/extractApiErrorMessage';
import { findUncoveredTopics } from '../../../utils/topicAgencyCoverage';
import { useTenantTopics } from '../../../hooks/useTenantTopics';
import { useCounselorById } from '../../../hooks/useCounselorById';
import { GrantConsultantIdentityModal } from '../../../components/GrantConsultantIdentityModal';
import { CreateAgencyModal } from '../../../components/CreateAgencyModal';
import { resolveAgencyTenantId } from '../../../api/agency/addAgencyData';
import { isActiveDeleteDate } from '../../../utils/deleteDate';
import { canGrantConsultantIdentity } from '../../../utils/canGrantConsultantIdentity';

const mergeTopicOptions = (current: Option[], incoming: Option[]): Option[] => {
    const seen = new Set(current.map(({ value }) => value));
    return [...current, ...incoming.filter(({ value }) => !seen.has(value))];
};

/**
 * Stable salutation keys (#994) — persisted as-is, rendered via i18n.
 * Wording of the option list follows the Counsellor Setup Wizard design:
 * Beraterin, Berater, Beratende Person, Berater*in, keine Angabe.
 */
const SALUTATION_KEYS = [
    'counsellor_female',
    'counsellor_male',
    'counselling_person',
    'counsellor_gender_neutral',
    'not_specified',
] as const;

export const UserEditOrAdd = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [form] = Form.useForm();
    const { can } = useUserPermissions();
    const { t } = useTranslation();
    const { isSuperAdmin, hasRole } = useUserRoles();
    // Mirrors the backend gate (AuthenticatedUser#hasTenantLevelAdminRole): remarks are
    // tenant-level-admin only. For any other role the field is omitted entirely — the
    // caller could neither read nor write it.
    const canManageAdminRemarks = hasRole([UserRole.TenantAdmin, UserRole.SingleTenantAdmin]);

    const { typeOfUsers, id } = useParams<{ id: string; typeOfUsers: TypeOfUser }>();
    const isEditing = id !== 'add';
    const isConsultantForm = typeOfUsers === TypeOfUser.Consultants;
    const { data: consultantsResponse, isLoading: isLoadingConsultants } = useConsultantsOrAdminsData({
        search: id,
        typeOfUser: typeOfUsers,
        enabled: isEditing && !!id,
    });
    const { data: agenciesData, isLoading } = useAgenciesData({ pageSize: 10000 });
    const { data: topics, isLoading: isLoadingTopics } = useTenantTopics(true);
    const { data: consultantById, isLoading: isLoadingConsultantById } = useCounselorById({
        id: isEditing && isConsultantForm ? id : undefined,
    });
    const singleData = consultantsResponse?.data.find((c) => c.id === id);
    const showGrantConsultantIdentity = canGrantConsultantIdentity(isEditing, typeOfUsers, singleData);
    const [isReadOnly, setReadOnly] = useState(isEditing);
    const [submitted] = useState(false);
    const [tenantsData, setTenantsData] = useState([]);
    const [userTenantId, setUserTenantId] = useState<number>(0);
    const [filteredAgencies, setFilteredAgencies] = useState([]);
    const selectedTenant = Form.useWatch('tenantId', form);
    const selectedAgencies = Form.useWatch('agencies', form) || [];
    const selectedTopicIds = Form.useWatch('topicIds', form) || [];
    const publicSlug = Form.useWatch('publicSlug', form);
    const pendingPublicSlug = Form.useWatch('pendingPublicSlug', form);
    const publicSlugStatus = Form.useWatch('publicSlugStatus', form);
    const prevAgencyIdsRef = useRef<string[] | null>(null);
    const topicsForList = topics?.filter((topic) => !selectedTopicIds.find(({ value }) => value === `${topic.id}`));
    const topicOptions = [
        ...selectedTopicIds.filter((selected) => !topics?.some((topic) => `${topic.id}` === selected.value)),
        ...convertToOptions(topicsForList, 'name', 'id'),
    ];
    const hasSelectedAgencies = selectedAgencies.length > 0;
    const consultantTopics = consultantById?.topics || [];
    const showTopicsField =
        isConsultantForm &&
        topics?.length > 0 &&
        (hasSelectedAgencies || (isEditing && consultantTopics.length > 0) || selectedTopicIds.length > 0);

    useEffect(() => {
        const { tenantId = 0 } = parseUserAuthInfo();
        setUserTenantId(tenantId);

        if (isSuperAdmin) {
            searchTenantData({ perPage: 1000 }).then(({ data }) => setTenantsData(data));
        } else if (tenantId > 0) {
            getSingleTenantData(tenantId).then((data) => {
                setTenantsData([data]);
                form.setFieldsValue({ tenantId: tenantId.toString() });
            });
        }
    }, []);

    useEffect(() => {
        const filterAgenciesByTenantId = ({ data = [], tenantId }) => {
            if (!tenantId) return [];
            return data?.filter(
                ({ deleteDate, tenantId: agencyTenantId }) =>
                    isActiveDeleteDate(deleteDate) && agencyTenantId === parseInt(tenantId, 10),
            );
        };

        setFilteredAgencies(filterAgenciesByTenantId({ data: agenciesData?.data, tenantId: selectedTenant }));
    }, [agenciesData, selectedTenant]);

    useEffect(() => {
        if (isEditing) return;
        form.setFieldValue('agencies', []);
        form.setFieldValue('topicIds', []);
        prevAgencyIdsRef.current = [];
    }, [selectedTenant, isEditing]);

    useEffect(() => {
        if (!isConsultantForm || !hasSelectedAgencies) {
            if (!isEditing) {
                form.setFieldValue('topicIds', []);
            }
            prevAgencyIdsRef.current = hasSelectedAgencies ? prevAgencyIdsRef.current : [];
            return;
        }

        const currentAgencyIds = selectedAgencies.map(({ value }) => String(value));

        if (prevAgencyIdsRef.current === null && isEditing) {
            prevAgencyIdsRef.current = currentAgencyIds;
            return;
        }

        const newlyAddedAgencyIds = currentAgencyIds.filter(
            (agencyId) => !(prevAgencyIdsRef.current || []).includes(agencyId),
        );
        prevAgencyIdsRef.current = currentAgencyIds;

        if (newlyAddedAgencyIds.length === 0) {
            return;
        }

        const newAgencyTopics = filteredAgencies
            .filter((agency) => newlyAddedAgencyIds.includes(String(agency.id)))
            .flatMap((agency) => agency.topics || []);

        if (newAgencyTopics.length === 0) {
            return;
        }

        const currentTopicIds: Option[] = form.getFieldValue('topicIds') || [];
        form.setFieldValue(
            'topicIds',
            mergeTopicOptions(currentTopicIds, convertToOptions(newAgencyTopics, 'name', 'id')),
        );
    }, [selectedAgencies, filteredAgencies, isConsultantForm, hasSelectedAgencies, isEditing, form]);

    useEffect(() => {
        if (!isEditing || !isConsultantForm || !consultantById?.topics?.length) {
            return;
        }

        form.setFieldsValue({
            topicIds: convertToOptions(consultantById.topics, 'name', 'id'),
        });
        prevAgencyIdsRef.current = (form.getFieldValue('agencies') || []).map(({ value }) => String(value));
    }, [consultantById, isEditing, isConsultantForm, form]);

    // Personal-info fields (#994) are only served by the get-by-id endpoint, not by the
    // search result the rest of the form prefills from.
    useEffect(() => {
        if (!isEditing || !isConsultantForm || !consultantById) {
            return;
        }

        form.setFieldsValue({
            displayName: consultantById.displayName || '',
            internalDisplayName: consultantById.internalDisplayName || '',
            salutation: consultantById.salutation || undefined,
            position: consultantById.position || '',
            title: consultantById.title || '',
            ...(canManageAdminRemarks ? { adminRemarks: consultantById.adminRemarks || '' } : {}),
        });
    }, [consultantById, isEditing, isConsultantForm, canManageAdminRemarks, form]);

    const { mutate } = useAddOrUpdateConsultantOrAdmin({
        id: isEditing ? id : null,
        typeOfUser: typeOfUsers,
        onSuccess: (response) => {
            const messagePrefix = isConsultantForm ? 'counselor' : 'agencyAdmin';
            message.success({
                content: t(`message.${messagePrefix}.${isEditing ? 'update' : 'add'}`),
                duration: 3,
            });

            if (!isEditing && (response as { agencyAssignmentFailed?: boolean })?.agencyAssignmentFailed) {
                message.warning({
                    content: t('message.agencyAdmin.agencyAssignmentFailed'),
                    duration: 8,
                });
            }

            navigate(`/admin/users/${typeOfUsers}`);
        },
        onError: async (error: Error | Response) => {
            if (error instanceof Response) {
                switch (error.headers.get(FETCH_ERRORS.X_REASON)) {
                    case X_REASON.EMAIL_NOT_AVAILABLE: {
                        const isAllowed =
                            can(PermissionAction.Delete, Resource.Consultant) && typeOfUsers === TypeOfUser.Consultants;
                        message.error({
                            content: t(
                                `${isAllowed ? '' : 'notAllowed.'}message.error.${error.headers.get(
                                    FETCH_ERRORS.X_REASON,
                                )}`,
                            ),
                            duration: 8,
                        });
                        return;
                    }
                    case X_REASON.USERNAME_NOT_AVAILABLE:
                        message.error({
                            content: t('message.error.USERNAME_NOT_AVAILABLE'),
                            duration: 8,
                        });
                        return;
                    case X_REASON.NUMBER_OF_LICENSES_EXCEEDED:
                        message.error({
                            content: t('message.error.NUMBER_OF_LICENSES_EXCEEDED'),
                            duration: 8,
                        });
                        return;
                    case X_REASON.PASSWORD_NOT_VALID:
                        message.error({
                            content: t('message.error.PASSWORD_NOT_VALID'),
                            duration: 8,
                        });
                        return;
                    default:
                        break;
                }
            }

            const content = await extractApiErrorMessage(error);
            message.error({ content, duration: 8 });
        },
    });

    // Mirror the backend ADR-003 rule (ConsultantTopicAgencyCompatibilityValidator):
    // every selected topic must be offered by at least one selected agency. Catching this
    // here means we name the mismatch instead of relying on the assignment request, which
    // the backend used to swallow silently.
    const onSave = useCallback(
        (data) => {
            if (isConsultantForm) {
                const uncoveredTopics = findUncoveredTopics(
                    data.agencies ?? [],
                    data.topicIds ?? [],
                    filteredAgencies || [],
                );
                if (uncoveredTopics.length > 0) {
                    form.setFields([
                        {
                            name: 'topicIds',
                            errors: [
                                t('message.error.topicsNotCoveredByAgencies', {
                                    topics: uncoveredTopics.map(({ label }) => label).join(', '),
                                }),
                            ],
                        },
                    ]);
                    return;
                }
            }
            mutate(data);
        },
        [isConsultantForm, filteredAgencies, form, mutate, t],
    );
    const onCancel = useCallback(() => navigate(`/admin/users/${typeOfUsers}`), []);
    const isAbsentEnabled = useWatch('absent', form);
    const activePublicSlug = publicSlug || consultantById?.publicSlug;
    const pendingSlug = pendingPublicSlug || consultantById?.pendingPublicSlug;
    const slugStatus = publicSlugStatus || consultantById?.publicSlugStatus;
    let publicSlugAlertType: 'info' | 'success' | 'warning' = 'info';
    let publicSlugAlertDescription = t('counselor.publicSlug.status.empty');

    if (pendingSlug) {
        publicSlugAlertType = 'warning';
        publicSlugAlertDescription = t('counselor.publicSlug.status.pending', { slug: pendingSlug });
    } else if (slugStatus === 'REJECTED') {
        publicSlugAlertDescription = t('counselor.publicSlug.status.rejected');
    } else if (activePublicSlug) {
        publicSlugAlertType = 'success';
        publicSlugAlertDescription = t('counselor.publicSlug.status.active', { slug: activePublicSlug });
    }

    const approvePendingPublicSlug = () => {
        form.setFieldsValue({
            publicSlug: pendingSlug,
            rejectPendingPublicSlug: false,
        });
        form.submit();
    };

    const rejectPendingPublicSlug = () => {
        form.setFieldsValue({
            rejectPendingPublicSlug: true,
        });
        form.submit();
    };

    // Superadmins pick the tenant in the form; other admins carry it in their token.
    const agencyTenantId = resolveAgencyTenantId(selectedTenant, userTenantId);

    const requiredRule = { required: true, message: t('form.errors.required') };

    const onAgencyCreated = (agency) => {
        const current = form.getFieldValue('agencies') || [];
        form.setFieldValue('agencies', [
            ...current,
            {
                value: String(agency.id),
                label: [agency.postcode, agency.name, agency.city].filter(Boolean).join(' '),
            },
        ]);
    };

    return (
        <Page isLoading={isLoadingConsultants || isLoading || isLoadingTopics || isLoadingConsultantById} stickyHeader>
            <Page.BackWithActions path={`/admin/users/${typeOfUsers}`} titleKey="agency.add.general.headline">
                {showGrantConsultantIdentity && (
                    <GrantConsultantIdentityModal
                        adminId={id}
                        tenantId={singleData?.tenantId}
                        onSuccess={() => {
                            queryClient.invalidateQueries({ queryKey: [typeOfUsers.toUpperCase()] });
                            navigate(`/admin/users/${typeOfUsers}`);
                        }}
                    />
                )}
                {isReadOnly && (
                    <Button type="text" className="admin-m3-text-button" onClick={() => setReadOnly(false)}>
                        {t('edit')}
                    </Button>
                )}
                {!isReadOnly && (
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

            <ThemeProvider theme={orisoMuiTheme}>
                <Form
                    disabled={isReadOnly}
                    labelAlign="left"
                    labelWrap
                    layout="vertical"
                    form={form}
                    onFinish={onSave}
                    initialValues={{
                        ...(singleData || {
                            formalLanguage: true,
                        }),
                        username: decodeUsername(singleData?.username || ''),
                        agencies: convertToOptions(singleData?.agencies || [], ['postcode', 'name', 'city'], 'id'),
                        topicIds: convertToOptions(consultantById?.topics || [], 'name', 'id'),
                        publicSlug: consultantById?.publicSlug || singleData?.publicSlug || '',
                        pendingPublicSlug: consultantById?.pendingPublicSlug || singleData?.pendingPublicSlug || '',
                        publicSlugStatus: consultantById?.publicSlugStatus || singleData?.publicSlugStatus || '',
                        rejectPendingPublicSlug: false,
                        tenantId:
                            singleData?.tenantId?.toString() || (userTenantId > 0 && userTenantId.toString()) || '',
                    }}
                >
                    <Row gutter={[20, 10]}>
                        <Col xs={24} lg={12}>
                            <Card titleKey="agency.edit.general.general_information">
                                <MuiFormField
                                    name="firstname"
                                    label={t('firstname')}
                                    placeholder={t('placeholder.firstname')}
                                    required
                                    rules={[requiredRule]}
                                />

                                <MuiFormField
                                    name="lastname"
                                    label={t('lastname')}
                                    placeholder={t('placeholder.lastname')}
                                    required
                                    rules={[requiredRule]}
                                />

                                {isConsultantForm && (
                                    <>
                                        <MuiFormField
                                            name="displayName"
                                            label={t('counselor.displayName')}
                                            placeholder={t('counselor.displayName.placeholder')}
                                            helpText={t('counselor.displayName.hint')}
                                        />

                                        <MuiFormField
                                            name="internalDisplayName"
                                            label={t('counselor.internalDisplayName')}
                                            placeholder={t('counselor.internalDisplayName.placeholder')}
                                            helpText={t('counselor.internalDisplayName.hint')}
                                        />

                                        {/*
                                          Deliberately not clearable. Clearing the select yields
                                          `undefined`, which the API layer omits and the backend
                                          reads as "leave unchanged" — so the clear affordance
                                          would silently fail to persist. `not_specified` ("keine
                                          Angabe") is the canonical way to say "no salutation", so
                                          nothing is lost by removing it. Sending `''` instead
                                          would introduce a second representation of "none" and
                                          would wipe a stored salutation whenever the form is
                                          submitted before getConsultantById has prefilled it.
                                        */}
                                        <MuiSelectField
                                            name="salutation"
                                            label="counselor.salutation"
                                            placeholder="plsSelect"
                                            options={SALUTATION_KEYS.map((key) => ({
                                                value: key,
                                                label: t(`counselor.salutation.option.${key}`),
                                            }))}
                                        />

                                        <MuiFormField
                                            name="position"
                                            label={t('counselor.position')}
                                            placeholder={t('counselor.position.placeholder')}
                                        />

                                        <MuiFormField
                                            name="title"
                                            label={t('counselor.personalTitle')}
                                            placeholder={t('counselor.personalTitle.placeholder')}
                                        />

                                        {canManageAdminRemarks && (
                                            <MuiMultilineFormField
                                                name="adminRemarks"
                                                label={t('counselor.adminRemarks')}
                                                helpText={t('counselor.adminRemarks.hint')}
                                            />
                                        )}
                                    </>
                                )}

                                <MuiFormField
                                    name="email"
                                    label={t('email')}
                                    placeholder={t('placeholder.email')}
                                    rules={[
                                        {
                                            required: true,
                                            type: 'email',
                                            message: t('message.error.email.incorrect'),
                                        },
                                    ]}
                                />

                                <MuiFormField
                                    name="username"
                                    label={t('counselor.username')}
                                    placeholder={t('placeholder.username')}
                                    disabled={isEditing}
                                    rules={usernameFormRules(t)}
                                />

                                {!isEditing &&
                                    (typeOfUsers === TypeOfUser.Consultants ||
                                        typeOfUsers === TypeOfUser.AgencyAdmins) && (
                                        <>
                                            <MuiPasswordFormField
                                                name="password"
                                                label={t('counselor.password')}
                                                placeholder={t('placeholder.password')}
                                                required
                                                rules={[requiredRule, ...passwordFormRules(t)]}
                                            />
                                            <MuiPasswordFormField
                                                name="passwordConfirmation"
                                                label={t('counselor.passwordConfirmation')}
                                                placeholder={t('placeholder.password')}
                                                required
                                                dependencies={['password']}
                                                rules={[
                                                    requiredRule,
                                                    ({ getFieldValue }) => ({
                                                        validator(_, value) {
                                                            if (!value || getFieldValue('password') === value) {
                                                                return Promise.resolve();
                                                            }
                                                            return Promise.reject(
                                                                new Error(
                                                                    t('profile.passwordChange.error.passwordsNotMatch'),
                                                                ),
                                                            );
                                                        },
                                                    }),
                                                ]}
                                            />
                                        </>
                                    )}
                            </Card>
                        </Col>
                        <Col xs={24} lg={12}>
                            <Space direction="vertical" size={20} className={styles.columnStack}>
                                <Card titleKey="settings.title">
                                    <MuiSelectField
                                        name="tenantId"
                                        placeholder="tenantAdmins.form.tenant"
                                        required
                                        disabled={isReadOnly || isEditing || !isSuperAdmin}
                                        className={styles.select}
                                        label="tenantAdmins.form.tenantAssignment"
                                        options={convertToOptions(tenantsData || [], 'name', 'id')}
                                    />

                                    <MuiSelectField
                                        name="agencies"
                                        label="agency"
                                        labelInValue
                                        isMulti
                                        placeholder="plsSelect"
                                        options={convertToOptions(filteredAgencies, ['postcode', 'name', 'city'], 'id')}
                                    />

                                    <div className={styles.createAgency}>
                                        <CreateAgencyModal
                                            tenantId={agencyTenantId}
                                            disabled={isReadOnly}
                                            onSuccess={onAgencyCreated}
                                        />
                                    </div>

                                    {showTopicsField && (
                                        <MuiSelectField
                                            label="topics.title"
                                            name="topicIds"
                                            labelInValue
                                            isMulti
                                            allowClear
                                            placeholder="plsSelect"
                                            options={topicOptions}
                                        />
                                    )}

                                    {isConsultantForm && (
                                        <>
                                            <div className={styles.switchGroup}>
                                                <MuiSwitchField
                                                    label={t('counselor.formalLanguage.title')}
                                                    name="formalLanguage"
                                                />
                                                {/* Temporarily hidden: {isEditing && <MuiSwitchField label={t('counselor.absent')} name="absent" />} */}
                                                {/* Temporarily hidden: {isEnabled(FeatureFlag.GroupChatV2) && (
                                                <MuiSwitchField
                                                    label={t('counselor.isGroupChatConsultant')}
                                                    name="isGroupchatConsultant"
                                                />
                                            )} */}
                                                <MuiSwitchField
                                                    label={t('counselor.isSupervisor')}
                                                    name="isSupervisor"
                                                />
                                            </div>
                                            {isAbsentEnabled && (
                                                <MuiMultilineFormField
                                                    label={t('counselor.absenceMessage')}
                                                    name="absenceMessage"
                                                />
                                            )}
                                        </>
                                    )}
                                </Card>

                                {isConsultantForm && (
                                    <Card titleKey="counselor.publicSlug.status.title">
                                        <MuiFormField
                                            name="publicSlug"
                                            label={t('counselor.publicSlug')}
                                            placeholder={t('placeholder.publicSlug')}
                                            rules={[
                                                {
                                                    pattern: /^[a-z]+(-[a-z]+)*$/,
                                                    message: t('message.error.publicSlug.format'),
                                                },
                                            ]}
                                        />
                                        <Form.Item name="pendingPublicSlug" hidden>
                                            <input />
                                        </Form.Item>
                                        <Form.Item name="publicSlugStatus" hidden>
                                            <input />
                                        </Form.Item>
                                        <Form.Item name="rejectPendingPublicSlug" hidden>
                                            <input />
                                        </Form.Item>
                                        {isEditing && (
                                            <Alert
                                                type={publicSlugAlertType}
                                                showIcon
                                                message={t('counselor.publicSlug.status.title')}
                                                description={publicSlugAlertDescription}
                                            />
                                        )}
                                        {pendingSlug && (
                                            <Space>
                                                <Button
                                                    type="primary"
                                                    disabled={isReadOnly}
                                                    onClick={approvePendingPublicSlug}
                                                >
                                                    {t('counselor.publicSlug.approve')}
                                                </Button>
                                                <Button disabled={isReadOnly} onClick={rejectPendingPublicSlug}>
                                                    {t('counselor.publicSlug.reject')}
                                                </Button>
                                            </Space>
                                        )}
                                    </Card>
                                )}
                            </Space>
                        </Col>
                    </Row>
                </Form>
            </ThemeProvider>
        </Page>
    );
};
