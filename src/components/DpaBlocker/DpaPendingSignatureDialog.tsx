import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import HourglassTopRounded from '@mui/icons-material/HourglassTopRounded';
import { useTranslation } from 'react-i18next';
import { Modal } from '../Modal';
import { CopyLinkRow } from '../DpaForwardDialog/CopyLinkRow';
import { DpaForwardDialog, DpaForwardResult } from '../DpaForwardDialog/DpaForwardDialog';
import { DpaForwardLink, DpaForwardOutcome } from '../../api/tenantOnboarding/dpaForward';
import styles from './pendingSignatureDialog.module.scss';

export interface DpaPendingSignatureDialogProps {
    /**
     * Mints a shareable sign link for the waiting tenant. There is no "read
     * the active link" endpoint — issuing a new one is the supported way, and
     * every issued link stays valid until a signature lands (#723 contract).
     */
    ensureSignLink: () => Promise<DpaForwardLink>;
    /** Sends the DPA_FORWARD mail again (or to a different address). */
    forward: (request: { recipientEmail?: string }) => Promise<DpaForwardOutcome>;
    /** "Später" — the admin proceeds to the (non-legal) admin area. */
    onDismiss: () => void;
    /** The embedded forward dialog was completed (fresh link and/or mail sent). */
    onForwardCompleted: (result: DpaForwardResult) => void;
}

type LinkState = { kind: 'loading' } | { kind: 'ready'; link: DpaForwardLink } | { kind: 'error' };

/**
 * Friendly recurring pending-signature dialog (#724, epic #722): shown on
 * each login while the tenant's DPA signature is pending after a forward —
 * INSTEAD of the hard {@link DpaBlocker} dead end. Calm status, a sign link
 * ready to copy, the option to send the mail again through the shared forward
 * dialog (#723), and a dismiss that lets the admin work on non-legal data.
 *
 * Presentation only: the backend gate for legal-gated operations is untouched,
 * and the never-forwarded unsigned state keeps the hard blocker (#572).
 */
export const DpaPendingSignatureDialog = ({
    ensureSignLink,
    forward,
    onDismiss,
    onForwardCompleted,
}: DpaPendingSignatureDialogProps) => {
    const { t } = useTranslation();
    const [resendOpen, setResendOpen] = useState(false);
    const [linkState, setLinkState] = useState<LinkState>({ kind: 'loading' });

    useEffect(() => {
        let cancelled = false;
        ensureSignLink()
            .then((link) => {
                if (!cancelled) setLinkState({ kind: 'ready', link });
            })
            .catch(() => {
                if (!cancelled) setLinkState({ kind: 'error' });
            });
        return () => {
            cancelled = true;
        };
        // The callback is stable by contract — mint exactly one link per open.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (resendOpen) {
        return (
            <DpaForwardDialog
                forward={forward}
                // Shown after login on an authenticated admin surface, so the
                // admin-only branded mail preview is reachable here.
                surface="admin"
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
                {linkState.kind === 'loading' && (
                    <p className={styles.note} role="status">
                        {t('dpaForward.dialog.linkPending')}
                    </p>
                )}
                {linkState.kind === 'error' && (
                    // Not a dead end: "E-Mail senden" still opens the forward
                    // dialog, which mints a link of its own.
                    <Alert severity="warning" data-testid="dpa-pending-link-error">
                        {t('dpaPending.linkUnavailable')}
                    </Alert>
                )}
                {linkState.kind === 'ready' && <CopyLinkRow value={linkState.link.signUrl} />}
                <p className={styles.note}>{t('dpaPending.gatedNote')}</p>
            </div>
        </Modal>
    );
};
