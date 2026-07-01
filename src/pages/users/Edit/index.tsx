import { Button, message, Space, Col, Row, Form } from 'antd';
import { useWatch } from 'antd/lib/form/Form';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { FETCH_ERRORS, X_REASON } from '../../../api/fetchData';
import { Card } from '../../../components/Card';
import { FormInputField } from '../../../components/FormInputField';
import { FormPasswordField } from '../../../components/FormPasswordField';
import { FormTextAreaField } from '../../../components/FormTextAreaField';
import { Page } from '../../../components/Page';
import { SelectFormField, Option } from '../../../components/SelectFormField';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { TypeOfUser } from '../../../enums/TypeOfUser';
import { useAddOrUpdateConsultantOrAdmin } from '../../../hooks/useAddOrUpdateConsultantOrAgencyAdmin';
import { useAgenciesData } from '../../../hooks/useAgencysData';
import { useConsultantsOrAdminsData } from '../../../hooks/useConsultantsOrAdminsData';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { convertToOptions } from '../../../utils/convertToOptions';
import { decodeUsername } from '../../../utils/encryptionHelpers';
import { FormSwitchField } from '../../../components/FormSwitchField';
import styles from './styles.module.scss';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { parseUserAuthInfo } from '../../../utils/parseUserAuthInfo';
import { searchTenantData } from '../../../api/tenant/searchTenantData';
import { getSingleTenantData } from '../../../api/tenant/getSingleTenantData';
import { extractApiErrorMessage } from '../../../utils/extractApiErrorMessage';
import { useTenantTopics } from '../../../hooks/useTenantTopics';
import { useCounselorById } from '../../../hooks/useCounselorById';
import { GrantConsultantIdentityModal } from '../../../components/GrantConsultantIdentityModal';
import { isActiveDeleteDate } from '../../../utils/deleteDate';

const mergeTopicOptions = (current: Option[], incoming: Option[]): Option[] => {
    const seen = new Set(current.map(({ value }) => value));
    return [...current, ...incoming.filter(({ value }) => !seen.has(value))];
};

export const UserEditOrAdd = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [form] = Form.useForm();
    const { can } = useUserPermissions();
    const { t } = useTranslation();
    const { isSuperAdmin } = useUserRoles();

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
    const isAdminUserForm = typeOfUsers === TypeOfUser.AgencyAdmins || typeOfUsers === TypeOfUser.TenantAdmins;
    const canGrantConsultantIdentity = isEditing && isAdminUserForm && !!singleData && !singleData.hasOtherIdentity;
    const [isReadOnly, setReadOnly] = useState(isEditing);
    const [submitted] = useState(false);
    const [tenantsData, setTenantsData] = useState([]);
    const [userTenantId, setUserTenantId] = useState<number>(0);
    const [filteredAgencies, setFilteredAgencies] = useState([]);
    const selectedTenant = Form.useWatch('tenantId', form);
    const selectedAgencies = Form.useWatch('agencies', form) || [];
    const selectedTopicIds = Form.useWatch('topicIds', form) || [];
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

    const onSave = useCallback((data) => mutate(data), []);
    const onCancel = useCallback(() => navigate(`/admin/users/${typeOfUsers}`), []);
    const isAbsentEnabled = useWatch('absent', form);

    return (
        <Page isLoading={isLoadingConsultants || isLoading || isLoadingTopics || isLoadingConsultantById} stickyHeader>
            <Page.BackWithActions path={`/admin/users/${typeOfUsers}`} titleKey="agency.add.general.headline">
                {canGrantConsultantIdentity && (
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
                    <Button type="primary" onClick={() => setReadOnly(false)}>
                        {t('edit')}
                    </Button>
                )}
                {!isReadOnly && (
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
                    tenantId: singleData?.tenantId?.toString() || (userTenantId > 0 && userTenantId.toString()) || '',
                }}
            >
                <Row gutter={[20, 10]}>
                    <Col xs={12} lg={6}>
                        <Card titleKey="agency.edit.general.general_information">
                            <FormInputField
                                name="firstname"
                                labelKey="firstname"
                                placeholderKey="placeholder.firstname"
                                required
                            />

                            <FormInputField
                                name="lastname"
                                labelKey="lastname"
                                placeholderKey="placeholder.lastname"
                                required
                            />

                            <FormInputField
                                name="email"
                                labelKey="email"
                                placeholderKey="placeholder.email"
                                rules={[
                                    {
                                        required: true,
                                        type: 'email',
                                        message: t('message.error.email.incorrect'),
                                    },
                                ]}
                            />

                            <FormInputField
                                name="username"
                                labelKey="counselor.username"
                                placeholderKey="placeholder.username"
                                disabled={isEditing}
                                rules={[
                                    {
                                        required: true,
                                        message: t('message.error.username.required'),
                                    },
                                    {
                                        pattern: /^[a-z0-9_-]+$/,
                                        message: t('message.error.username.format'),
                                    },
                                ]}
                            />

                            {!isEditing &&
                                (typeOfUsers === TypeOfUser.Consultants || typeOfUsers === TypeOfUser.AgencyAdmins) && (
                                    <>
                                        <FormPasswordField
                                            name="password"
                                            labelKey="counselor.password"
                                            placeholderKey="placeholder.password"
                                            required
                                            rules={[
                                                {
                                                    min: 8,
                                                    message: t('message.error.password.minLength'),
                                                },
                                                {
                                                    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,
                                                    message: t('message.error.password.policy'),
                                                },
                                            ]}
                                        />
                                        <FormPasswordField
                                            name="passwordConfirmation"
                                            labelKey="counselor.passwordConfirmation"
                                            placeholderKey="placeholder.password"
                                            required
                                            dependencies={['password']}
                                            rules={[
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
                    <Col xs={12} lg={6}>
                        <Card titleKey="settings.title">
                            <SelectFormField
                                name="tenantId"
                                placeholder="tenantAdmins.form.tenant"
                                required
                                disabled={isReadOnly || isEditing || !isSuperAdmin}
                                className={styles.select}
                                label="tenantAdmins.form.tenantAssignment"
                                options={convertToOptions(tenantsData || [], 'name', 'id')}
                            />

                            <SelectFormField
                                name="agencies"
                                label="agency"
                                labelInValue
                                isMulti
                                placeholder="plsSelect"
                                options={convertToOptions(filteredAgencies, ['postcode', 'name', 'city'], 'id')}
                            />

                            {showTopicsField && (
                                <SelectFormField
                                    label="topics.title"
                                    name="topicIds"
                                    labelInValue
                                    isMulti
                                    allowClear
                                    placeholder="plsSelect"
                                    options={topicOptions}
                                />
                            )}

                            {typeOfUsers === 'consultants' && (
                                <>
                                    <Space align="center">
                                        <FormSwitchField
                                            labelKey="counselor.formalLanguage.title"
                                            name="formalLanguage"
                                        />
                                        {/* Temporarily hidden: {isEditing && <FormSwitchField labelKey="counselor.absent" name="absent" />} */}
                                        {/* Temporarily hidden: {isEnabled(FeatureFlag.GroupChatV2) && (
                                            <FormSwitchField
                                                labelKey="counselor.isGroupChatConsultant"
                                                name="isGroupchatConsultant"
                                            />
                                        )} */}
                                        <FormSwitchField labelKey="counselor.isSupervisor" name="isSupervisor" />
                                    </Space>
                                    {isAbsentEnabled && (
                                        <FormTextAreaField labelKey="counselor.absenceMessage" name="absenceMessage" />
                                    )}
                                </>
                            )}
                        </Card>
                    </Col>
                </Row>
            </Form>
        </Page>
    );
};
