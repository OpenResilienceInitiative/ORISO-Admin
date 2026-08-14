import { useState } from 'react';
import Alert from '@mui/material/Alert';
import HourglassTopRounded from '@mui/icons-material/HourglassTopRounded';
import { useTranslation } from 'react-i18next';
import { Modal } from '../Modal';
import { CopyLinkRow } from '../DpaForwardDialog/CopyLinkRow';
import { DpaForwardDialog, DpaForwardLink, DpaForwardResult, DpaForwardSendRequest } from '../DpaForwardDialog/DpaForwardDialog';
import { ActiveDpaForward, isDpaForwardExpired } from '../../api/tenantOnboarding/dpaForward';
import styles from './pendingSignatureDialog.module.scss';

export interface DpaPendingSignatureDialogProps {
    /** The tenant's active (possibly expired) forward sign invite. */
    forward: ActiveDpaForward;
    /**
     * Returns a VALID sign link for sharing: the active one, or a freshly
     * created one when the active link has expired (#724 "declaration path").
     */
    ensureSignLink: () => Promise<DpaForwardLink>;
    /** Sends the DPA_FORWARD mail again (or to a different address). */
    sendEmail: (request: DpaForwardSendRequest) => Promise<void>;
    /** "Später" — the admin proceeds to the (non-legal) admin area. */
    onDismiss: () => void;
    /** The embedded forward dialog was completed (fresh link and/or mail sent). */
    onForwardCompleted: (result: DpaForwardResult) => void;
}

/**
 * Friendly recurring pending-signature dialog (#724, epic #722): shown on
 * each login while the tenant's DPA signature is pending after an explicit
 * forward — INSTEAD of the hard {@link DpaBlocker} dead end. Calm status, the
 * active sign link ready to copy, the option to send the mail again through
 * the shared forward dialog (#723), and a dismiss that lets the admin work on
 * non-legal data. Presentation only: the backend gate for legal-gated
 * operations is untouched, and the never-forwarded unsigned state keeps the
 * hard blocker (#572).
 */
export const DpaPendingSignatureDialog = ({
    forward,
    ensureSignLink,
    sendEmail,
    onDismiss,
    onForwardCompleted,
}: DpaPendingSignatureDialogProps) => {
    const { t } = useTranslation();
    const [resendOpen, setResendOpen] = useState(false);
    const expired = isDpaForwardExpired(forward);

    if (resendOpen) {
        return (
            <DpaForwardDialog
                ensureSignLink={ensureSignLink}
                sendEmail={sendEmail}
                onClose={() => setResendOpen(false)}
                onForwarded={(result) => {
                    setResendOpen(false);
                    onForwardCompleted(result);
                }}
            />
        );
    }

    return (
        <Modal
            titleKey="dpaPending.title"
            descriptionKey="dpaPending.description"
            icon={<HourglassTopRounded fontSize="inherit" />}
            okLabelKey="dpaPending.resend"
            cancelLabelKey="dpaPending.later"
            onConfirm={() => setResendOpen(true)}
            onClose={onDismiss}
            width={560}
        >
            <div className={styles.body} data-testid="dpa-pending-dialog">
                {expired ? (
                    <Alert severity="warning" data-testid="dpa-pending-expired">
                        {t('dpaPending.expired')}
                    </Alert>
                ) : (
                    <CopyLinkRow value={forward.signLink} />
                )}
                {forward.recipientEmail && (
                    <p className={styles.note} data-testid="dpa-pending-sent-to">
                        {t('tenantOnboarding.dpa.forwarded.sentTo', { email: forward.recipientEmail })}
                    </p>
                )}
                <p className={styles.note}>{t('dpaPending.gatedNote')}</p>
            </div>
        </Modal>
    );
};
