import { useState } from 'react';
import { Form } from 'antd';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../components/Card';
import { M3Button } from '../../../components/M3Button';
import { MuiFormField } from '../../../components/mui/MuiFormField';
import { EmailPreviewFrame } from '../../../components/EmailPreview/EmailPreviewFrame';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { useServiceNoticeDraft } from '../../../hooks/useServiceNoticeDraft.hook';
import {
    SERVICE_NOTICE_VARIANTS,
    serviceNoticeErrorKey,
    type ServiceNoticeDraft,
    type ServiceNoticeDraftInput,
    type ServiceNoticeVariant,
} from '../../../api/serviceNotices/serviceNotices';

type DraftForm = ServiceNoticeDraftInput & { campaignKey: string };

export const ServiceNoticesPage = () => {
    const { t } = useTranslation();
    const { isSuperAdmin, isTechnicalAccount, tokenUnreadable } = useUserRoles();
    const allowed = isSuperAdmin && !isTechnicalAccount && !tokenUnreadable;
    const [form] = Form.useForm<DraftForm>();
    const [draft, setDraft] = useState<ServiceNoticeDraft | null>(null);
    const [variant, setVariant] = useState<ServiceNoticeVariant>('de-sie');
    const [operationError, setOperationError] = useState<string | null>(null);
    const { save, open, preview } = useServiceNoticeDraft(draft?.campaignKey ?? null, variant, allowed);
    const busy = save.isPending || open.isPending;

    const applyDraft = (saved: ServiceNoticeDraft) => {
        setDraft(saved);
        form.setFieldsValue({
            ...saved,
            maintenanceStart: saved.maintenanceStart.slice(0, 5),
            maintenanceEnd: saved.maintenanceEnd.slice(0, 5),
        });
    };
    const onSave = async ({ campaignKey, ...input }: DraftForm) => {
        setOperationError(null);
        try {
            applyDraft(await save.mutateAsync({ campaignKey, input }));
        } catch (error) {
            setOperationError(serviceNoticeErrorKey(error));
        }
    };
    const onOpen = async () => {
        try {
            const { campaignKey } = await form.validateFields(['campaignKey']);
            setOperationError(null);
            applyDraft(await open.mutateAsync(campaignKey));
        } catch (error) {
            if (typeof error !== 'object' || error === null || !('errorFields' in error)) {
                setOperationError(serviceNoticeErrorKey(error));
            }
        }
    };

    if (!allowed) return <Alert severity="error">{t('serviceNotices.errors.forbidden')}</Alert>;

    const actualPreview = preview.data;
    const previewMatches = actualPreview?.variant === variant && actualPreview.campaignKey === draft?.campaignKey;

    return (
        <Stack spacing={2}>
            <Card titleKey="serviceNotices.title" subTitleKey="serviceNotices.description" autoHeight>
                <Stack spacing={2}>
                    <Alert severity="info">{t('serviceNotices.draftOnly')}</Alert>
                    {operationError && <Alert severity="error">{t(operationError)}</Alert>}
                    <Form<DraftForm>
                        form={form}
                        layout="vertical"
                        onFinish={onSave}
                        disabled={busy}
                        initialValues={{ statusUrl: '', campaignKey: '' }}
                    >
                        <MuiFormField
                            name="campaignKey"
                            label={t('serviceNotices.reference')}
                            rules={[
                                { required: true, message: t('serviceNotices.required') },
                                {
                                    pattern: /^[A-Za-z0-9][A-Za-z0-9-]{0,79}$/,
                                    message: t('serviceNotices.referenceFormat'),
                                },
                            ]}
                        />
                        <MuiFormField
                            name="maintenanceDate"
                            type="date"
                            label={t('serviceNotices.date')}
                            rules={[{ required: true, message: t('serviceNotices.required') }]}
                        />
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                                <Typography component="label" htmlFor="service-notice-start">
                                    {t('serviceNotices.start')}
                                </Typography>
                                <MuiFormField
                                    name="maintenanceStart"
                                    id="service-notice-start"
                                    type="time"
                                    inputProps={{ step: 60 }}
                                    rules={[{ required: true, message: t('serviceNotices.required') }]}
                                />
                            </Stack>
                            <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                                <Typography component="label" htmlFor="service-notice-end">
                                    {t('serviceNotices.end')}
                                </Typography>
                                <MuiFormField
                                    name="maintenanceEnd"
                                    id="service-notice-end"
                                    type="time"
                                    inputProps={{ step: 60 }}
                                    rules={[{ required: true, message: t('serviceNotices.required') }]}
                                />
                            </Stack>
                        </Stack>
                        <MuiFormField
                            name="statusUrl"
                            type="url"
                            label={t('serviceNotices.statusUrl')}
                            rules={[
                                { required: true, message: t('serviceNotices.required') },
                                { pattern: /^https:\/\//, message: t('serviceNotices.httpsRequired') },
                            ]}
                        />
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <M3Button type="submit" variant="filled" disabled={busy} loading={save.isPending}>
                                {t('serviceNotices.save')}
                            </M3Button>
                            <M3Button variant="outlined" disabled={busy} loading={open.isPending} onClick={onOpen}>
                                {t('serviceNotices.open')}
                            </M3Button>
                        </Stack>
                    </Form>
                    {draft && (
                        <Alert severity="success">{t('serviceNotices.saved', { reference: draft.campaignKey })}</Alert>
                    )}
                </Stack>
            </Card>
            {draft && (
                <Card titleKey="serviceNotices.previewTitle" autoHeight>
                    <Stack spacing={2}>
                        <Typography>
                            {t('serviceNotices.savedWindow', {
                                reference: draft.campaignKey,
                                date: draft.maintenanceDate,
                                start: draft.maintenanceStart.slice(0, 5),
                                end: draft.maintenanceEnd.slice(0, 5),
                            })}
                        </Typography>
                        <TextField
                            select
                            label={t('serviceNotices.variant')}
                            value={variant}
                            onChange={(event) => setVariant(event.target.value as ServiceNoticeVariant)}
                        >
                            {SERVICE_NOTICE_VARIANTS.map((value) => (
                                <MenuItem key={value} value={value}>
                                    {t(`serviceNotices.variants.${value}`)}
                                </MenuItem>
                            ))}
                        </TextField>
                        {preview.isFetching && (
                            <Typography role="status">{t('serviceNotices.loadingPreview')}</Typography>
                        )}
                        {preview.isError && <Alert severity="error">{t(serviceNoticeErrorKey(preview.error))}</Alert>}
                        {actualPreview && !previewMatches && (
                            <Alert severity="error">{t('serviceNotices.errors.variantUnavailable')}</Alert>
                        )}
                        {actualPreview && previewMatches && (
                            <>
                                <Typography component="h2" variant="h6">
                                    {t('serviceNotices.subject')}
                                </Typography>
                                <Typography>{actualPreview.subject}</Typography>
                                <Typography component="h2" variant="h6">
                                    {t('serviceNotices.preheader')}
                                </Typography>
                                <Typography>{actualPreview.preheader}</Typography>
                                <EmailPreviewFrame
                                    html={actualPreview.html}
                                    title={t('serviceNotices.frameTitle')}
                                    dataTestId="service-notice-preview-frame"
                                />
                                <Typography component="h2" variant="h6">
                                    {t('serviceNotices.plainText')}
                                </Typography>
                                <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                                    {actualPreview.text}
                                </Typography>
                            </>
                        )}
                    </Stack>
                </Card>
            )}
        </Stack>
    );
};
