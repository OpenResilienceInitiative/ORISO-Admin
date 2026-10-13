import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../components/Card';
import { M3Button } from '../../../components/M3Button';
import { Modal } from '../../../components/Modal';
import { useServiceNoticeSend } from '../../../hooks/useServiceNoticeSend.hook';
import type {
    ServiceNoticeConfirmed,
    ServiceNoticeDraft,
    ServiceNoticeDryRun,
} from '../../../api/serviceNotices/serviceNotices';

const errorKey = (error: unknown): string => {
    if (error instanceof Response) {
        if (error.status === 403) return 'serviceNotices.send.errors.forbidden';
        if (error.status === 404) return 'serviceNotices.errors.notFound';
        if (error.status === 409) return 'serviceNotices.send.errors.conflict';
    }
    return 'serviceNotices.errors.unavailable';
};

/**
 * The send decision for one saved draft: count the recipients on the server first, then confirm
 * that exact number in a dialog. Nothing here chooses or shows recipient addresses.
 */
export const ServiceNoticeSend = ({ draft }: { draft: ServiceNoticeDraft }) => {
    const { t } = useTranslation();
    const { count, confirm } = useServiceNoticeSend();
    const [counted, setCounted] = useState<ServiceNoticeDryRun | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [done, setDone] = useState<ServiceNoticeConfirmed | null>(null);
    const [error, setError] = useState<string | null>(null);
    const busy = count.isPending || confirm.isPending;

    const onCount = async () => {
        setError(null);
        setCounted(null);
        try {
            setCounted(await count.mutateAsync(draft.campaignKey));
        } catch (failure) {
            setError(errorKey(failure));
        }
    };
    const onConfirm = async () => {
        if (!counted) return;
        setDialogOpen(false);
        setError(null);
        try {
            setDone(
                await confirm.mutateAsync({
                    campaignKey: draft.campaignKey,
                    expectedRecipients: counted.recipients,
                }),
            );
        } catch (failure) {
            // A refused confirmation invalidates the count: the operator counts again first.
            setCounted(null);
            setError(errorKey(failure));
        }
    };

    const confirmedBefore = draft.status === 'CONFIRMED' && !done;

    return (
        <Card titleKey="serviceNotices.send.title" subTitleKey="serviceNotices.send.description" autoHeight>
            <Stack spacing={2}>
                {error && <Alert severity="error">{t(error)}</Alert>}
                {confirmedBefore && <Alert severity="info">{t('serviceNotices.send.alreadyConfirmed')}</Alert>}
                {done && (
                    <Alert severity="success">
                        {t('serviceNotices.send.done', { recipients: done.recipients, mail: done.mailQueued })}
                    </Alert>
                )}
                {!confirmedBefore && !done && (
                    <>
                        {counted && (
                            <Typography role="status">
                                {t('serviceNotices.send.counts', {
                                    recipients: counted.recipients,
                                    mail: counted.mail,
                                    preferenceOff: counted.feedOnlyPreferenceOff,
                                    noAddress: counted.feedOnlyNoAddress + counted.feedOnlyNoSenderTenant,
                                })}
                            </Typography>
                        )}
                        {counted && counted.recipients === 0 && (
                            <Alert severity="warning">{t('serviceNotices.send.nobody')}</Alert>
                        )}
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <M3Button variant="outlined" disabled={busy} loading={count.isPending} onClick={onCount}>
                                {t('serviceNotices.send.count')}
                            </M3Button>
                            {counted && counted.recipients > 0 && (
                                <M3Button
                                    variant="filled"
                                    disabled={busy}
                                    loading={confirm.isPending}
                                    onClick={() => setDialogOpen(true)}
                                >
                                    {t('serviceNotices.send.open')}
                                </M3Button>
                            )}
                        </Stack>
                    </>
                )}
            </Stack>
            {dialogOpen && counted && (
                <Modal
                    titleKey="serviceNotices.send.dialogTitle"
                    icon={<SendOutlinedIcon />}
                    contentKey="serviceNotices.send.dialogText"
                    contentKeyOptions={{
                        recipients: counted.recipients,
                        mail: counted.mail,
                        date: draft.maintenanceDate,
                        start: draft.maintenanceStart.slice(0, 5),
                        end: draft.maintenanceEnd.slice(0, 5),
                    }}
                    cancelLabelKey="serviceNotices.send.cancel"
                    okLabelKey="serviceNotices.send.confirm"
                    confirmDisabled={busy}
                    onConfirm={onConfirm}
                    onClose={() => setDialogOpen(false)}
                />
            )}
        </Card>
    );
};
