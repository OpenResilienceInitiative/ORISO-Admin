import { Button, message, Space, Col, Row, Form } from 'antd';
import { useWatch } from 'antd/lib/form/Form';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { FETCH_ERRORS, X_REASON } from '../../../api/fetchData';
import { Card } from '../../../components/Card';
import { FormInputField } from '../../../components/FormInputField';
import { FormTextAreaField } from '../../../components/FormTextAreaField';
import { Page } from '../../../components/Page';
import { SelectFormField } from '../../../components/SelectFormField';
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
import { useFeatureContext } from '../../../context/FeatureContext';
import { FeatureFlag } from '../../../enums/FeatureFlag';
import styles from './styles.module.scss';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { parseUserAuthInfo } from '../../../utils/parseUserAuthInfo';
import { searchTenantData } from '../../../api/tenant/searchTenantData';
import { getSingleTenantData } from '../../../api/tenant/getSingleTenantData';

export const UserEditOrAdd = () => {
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const { can } = useUserPermissions();
    const { t } = useTranslation();
    const { isEnabled } = useFeatureContext();
    const { isSuperAdmin } = useUserRoles();

    const { typeOfUsers, id } = useParams<{ id: string; typeOfUsers: TypeOfUser }>();
    const { data: consultantsResponse, isLoading: isLoadingConsultants } = useConsultantsOrAdminsData({
        search: id,
        typeOfUser: typeOfUsers,
        enabled: !!id,
    });
    const { data: agenciesData, isLoading } = useAgenciesData({ pageSize: 10000 });

    const isEditing = id !== 'add';
    const singleData = consultantsResponse?.data.find((c) => c.id === id);
    const [isReadOnly, setReadOnly] = useState(isEditing);
    const [submitted] = useState(false);
    const [tenantsData, setTenantsData] = useState([]);
    const [userTenantId, setUserTenantId] = useState<number>(0);
    const [filteredAgencies, setFilteredAgencies] = useState([]);
    const selectedTenant = Form.useWatch('tenantId', form);

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
                    deleteDate === 'null' && agencyTenantId === parseInt(tenantId, 10),
            );
        };

        setFilteredAgencies(filterAgenciesByTenantId({ data: agenciesData?.data, tenantId: selectedTenant }));
    }, [agenciesData, selectedTenant]);

    useEffect(() => {
        if (isEditing) return;
        form.setFieldValue('agencies', []);
    }, [selectedTenant, isEditing]);

    const { mutate } = useAddOrUpdateConsultantOrAdmin({
        id: isEditing ? id : null,
        typeOfUser: typeOfUsers,
        onSuccess: (response) => {
            message.success({
                content: t(`message.counselor.${isEditing ? 'update' : 'add'}`),
                duration: 3,
            });
            navigate(`/admin/users/${typeOfUsers}/${response.id}`);
        },
        onError: (error: Error | Response) => {
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
                            duration: 3,
                        });
                        break;
                    }
                    case X_REASON.NUMBER_OF_LICENSES_EXCEEDED:
                        message.error({
                            content: t('message.error.NUMBER_OF_LICENSES_EXCEEDED'),
                            duration: 3,
                        });
                        break;
                    default:
                        message.error({
                            content: t('message.error.default'),
                            duration: 3,
                        });
                        break;
                }
            }
        },
    });

    const onSave = useCallback((data) => mutate(data), []);
    const onCancel = useCallback(() => navigate(`/admin/users/${typeOfUsers}`), []);
    const isAbsentEnabled = useWatch('absent', form);

    return (
        <Page isLoading={isLoadingConsultants || isLoading} stickyHeader>
            <Page.BackWithActions path={`/admin/users/${typeOfUsers}`} titleKey="agency.add.general.headline">
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
                                required
                                disabled={isEditing}
                                rules={[
                                    {
                                        pattern: /^[a-z0-9_-]+$/,
                                        message: t('message.error.username.format'),
                                    },
                                ]}
                            />

                            {!isEditing && typeOfUsers === 'consultants' && (
                                <FormInputField
                                    name="password"
                                    labelKey="counselor.password"
                                    placeholderKey="placeholder.password"
                                    type="password"
                                    required
                                    rules={[
                                        {
                                            min: 8,
                                            message: t('message.error.password.minLength'),
                                        },
                                    ]}
                                />
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

                            {typeOfUsers === 'consultants' && (
                                <>
                                    <Space align="center">
                                        <FormSwitchField
                                            labelKey="counselor.formalLanguage.title"
                                            name="formalLanguage"
                                        />
                                        {isEditing && <FormSwitchField labelKey="counselor.absent" name="absent" />}
                                        {isEnabled(FeatureFlag.GroupChatV2) && (
                                            <FormSwitchField
                                                labelKey="counselor.isGroupChatConsultant"
                                                name="isGroupchatConsultant"
                                            />
                                        )}
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
