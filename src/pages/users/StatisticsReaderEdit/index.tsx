import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Col, Form, Row } from 'antd';
import { ThemeProvider } from '@mui/material/styles';
import routePathNames from '../../../appConfig';
import { FETCH_ERRORS } from '../../../api/fetchData';
import { Card } from '../../../components/Card';
import { HintText } from '../../../components/HintText';
import { MuiFormField } from '../../../components/mui/MuiFormField';
import { Notify } from '../../../components/Notify';
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

/** The server refused the record (403) or does not have it (404): no record to show, not a failed load. */
const isNoAccessError = (error: Error | null) =>
    error?.message === FETCH_ERRORS.FORBIDDEN || error?.message === FETCH_ERRORS.NO_MATCH;

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

    const {
        data,
        isLoading,
        isFetching,
        isError,
        error: loadError,
        refetch,
    } = useStatisticsReaderData({ id, enabled: isEditing && canRead });

    // A cached record is shown at once and refreshed in the background. antd applies
    // initialValues only once, so the refreshed record is written into the form while it is still
    // read-only; editing starts only after the refresh (the edit button waits for it), so a save
    // never sends a stale e-mail back.
    useEffect(() => {
        if (isEditing && isReadOnly && data) form.setFieldsValue(data);
    }, [data, form, isEditing, isReadOnly]);

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
            if (data) form.setFieldsValue(data);
            setReadOnly(true);
        } else {
            navigate(listPath);
        }
    }, [data, form, isEditing, navigate]);

    const loadFailed = isEditing && !isLoading && isError && !isNoAccessError(loadError);
    if (!canRead || (isEditing && !isLoading && !loadFailed && (isError || !data))) {
        return <AccessDenied />;
    }

    // A network error or 5xx is not a permission problem: say so and offer to load again.
    if (loadFailed) {
        return (
            <Page>
                <Page.BackWithActions
                    path={listPath}
                    parentKey="sidebar.users"
                    title={t('users.sectionPills.statisticsReaders')}
                />
                <Notify
                    severity="error"
                    title={t('statisticsReaders.loadError.title')}
                    quietText={t('notify.tile.notLoaded')}
                    actions={[{ label: t('statisticsReaders.loadError.retry'), onClick: () => refetch() }]}
                    testId="statistics-reader-load-error"
                >
                    {t('statisticsReaders.loadError.text')}
                </Notify>
            </Page>
        );
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
                    <Button type="primary" disabled={isFetching} onClick={() => setReadOnly(false)}>
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
