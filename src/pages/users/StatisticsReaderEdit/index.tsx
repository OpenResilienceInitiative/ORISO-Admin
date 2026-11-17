import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Col, Form, Row } from 'antd';
import { ThemeProvider } from '@mui/material/styles';
import routePathNames from '../../../appConfig';
import { Card } from '../../../components/Card';
import { HintText } from '../../../components/HintText';
import { MuiFormField } from '../../../components/mui/MuiFormField';
import { Page } from '../../../components/Page';
import { snackbar } from '../../../components/Snackbar';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import {
    StatisticsReaderFormValues,
    useAddOrUpdateStatisticsReader,
    useStatisticsReaderData,
} from '../../../hooks/useStatisticsReaders';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { extractApiErrorMessage } from '../../../utils/extractApiErrorMessage';
import { AccessDenied } from '../../ErrorPages/AccessDenied';

const listPath = routePathNames.statisticsReaders;

/**
 * Create or edit a Statistik-Leser·in (ORISO-UserService#1666): a read-only account for the
 * platform statistics. Platform admins only — the permission map and the server agree on that.
 * No password field: the person gets an e-mail to set one, and sets up 2FA before any figure
 * is shown.
 */
const StatisticsReaderEditor = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const { id = 'add' } = useParams<{ id: string }>();
    const isEditing = id !== 'add';
    const [isReadOnly, setReadOnly] = useState(isEditing);
    const { isSuperAdmin } = useUserRoles();
    const { can } = useUserPermissions();
    const canRead = isSuperAdmin && can(PermissionAction.Read, Resource.StatisticsReaderUser);
    const canWrite =
        canRead && can(isEditing ? PermissionAction.Update : PermissionAction.Create, Resource.StatisticsReaderUser);

    const { data, isLoading, isError } = useStatisticsReaderData({ id, enabled: isEditing && canRead });

    const { mutate, isPending } = useAddOrUpdateStatisticsReader({
        id: isEditing ? id : undefined,
        onSuccess: () => {
            navigate(listPath);
            snackbar.success({ message: t(`statisticsReaders.message.${isEditing ? 'update' : 'add'}`) });
        },
        onError: async (error) => {
            snackbar.error({ message: await extractApiErrorMessage(error) });
        },
    });

    const onSave = useCallback(
        (values: StatisticsReaderFormValues) => {
            if (!canWrite || isReadOnly) return;
            mutate(values);
        },
        [canWrite, isReadOnly, mutate],
    );

    const onCancel = useCallback(() => {
        if (isEditing) {
            form.resetFields();
            setReadOnly(true);
        } else {
            navigate(listPath);
        }
    }, [form, isEditing, navigate]);

    if (!canRead || (isEditing && !isLoading && (isError || !data))) {
        return <AccessDenied />;
    }

    const title = isEditing
        ? `${data?.firstname ?? ''} ${data?.lastname ?? ''}`.trim()
        : t('statisticsReaders.edit.back');
    const requiredRule = { required: true, message: t('form.errors.required') };
    const fieldsDisabled = isReadOnly || !canWrite;

    return (
        <Page isLoading={isEditing && isLoading}>
            <Page.BackWithActions path={listPath} parentKey="sidebar.users" title={title}>
                {isReadOnly && canWrite && (
                    <Button type="primary" onClick={() => setReadOnly(false)}>
                        {t('edit')}
                    </Button>
                )}
                {!isReadOnly && canWrite && (
                    <>
                        <Button type="text" className="admin-m3-text-button" onClick={onCancel}>
                            {t('btn.cancel')}
                        </Button>
                        <Button type="primary" loading={isPending} onClick={() => form.submit()}>
                            {t('save')}
                        </Button>
                    </>
                )}
            </Page.BackWithActions>

            <ThemeProvider theme={orisoMuiTheme}>
                <Form
                    disabled={fieldsDisabled}
                    labelAlign="left"
                    labelWrap
                    layout="vertical"
                    form={form}
                    onFinish={onSave}
                    initialValues={data}
                >
                    <Row gutter={[24, 24]}>
                        <Col xs={24} lg={12}>
                            <Card titleKey="statisticsReaders.card.personalDataTitle">
                                <MuiFormField
                                    name="firstname"
                                    label={t('firstname')}
                                    placeholder={t('placeholder.firstname')}
                                    required
                                    rules={[requiredRule]}
                                    disabled={fieldsDisabled}
                                />
                                <MuiFormField
                                    name="lastname"
                                    label={t('lastname')}
                                    placeholder={t('placeholder.lastname')}
                                    required
                                    rules={[requiredRule]}
                                    disabled={fieldsDisabled}
                                />
                                <MuiFormField
                                    name="username"
                                    label={t('statisticsReaders.form.username')}
                                    placeholder={t('statisticsReaders.form.username')}
                                    required={!isEditing}
                                    rules={isEditing ? [] : [requiredRule]}
                                    // The username is fixed once the account exists.
                                    disabled={fieldsDisabled || isEditing}
                                />
                                <MuiFormField
                                    name="email"
                                    label={t('email')}
                                    placeholder={t('placeholder.email')}
                                    required
                                    rules={[
                                        requiredRule,
                                        { type: 'email', message: t('message.error.email.incorrect') },
                                    ]}
                                    disabled={fieldsDisabled}
                                />
                                <HintText>{t('statisticsReaders.hint.onboarding')}</HintText>
                            </Card>
                        </Col>
                    </Row>
                </Form>
            </ThemeProvider>
        </Page>
    );
};

export const StatisticsReaderEditOrAdd = () => {
    const { id } = useParams<{ id: string }>();
    return <StatisticsReaderEditor key={id} />;
};
