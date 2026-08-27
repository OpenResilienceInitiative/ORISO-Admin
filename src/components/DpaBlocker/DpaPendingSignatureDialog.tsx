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
    /**
     * "Abmelden" — the ONLY way off this screen (JOB7). There is no dismiss:
     * an unsigned tenant may not use the platform, so the dialog is a gate,
     * not a notice.
     */
    onLogout: () => void;
    /** The embedded forward dialog was completed (fresh link and/or mail sent). */
    onForwardCompleted?: (result: DpaForwardResult) => void;
    /**
     * JOB9: the tenant pressed "Plattform freischalten" and the re-check
     * against the backend found NO valid signature. Say so here, where the
     * remaining actions (copy the link, resend the mail) live.
     */
    recheckRejected?: boolean;
}

type LinkState = { kind: 'loading' } | { kind: 'ready'; link: DpaForwardLink } | { kind: 'error' };

/**
 * Recurring pending-signature GATE (#724, epic #722, hardened by JOB7):
 * shown for as long as the tenant's DPA signature is outstanding after a
 * forward. It is the whole screen — the admin routes are not rendered behind
 * it, the mask and Escape do not dismiss it, and the only exit is logout.
 *
 * It offers exactly what a waiting tenant can legitimately do: copy the sign
 * link, send the mail again through the shared forward dialog (#723), or log
 * out. When the signature lands the gate swaps this dialog for
 * {@link DpaUnlockDialog}.
 */
export const DpaPendingSignatureDialog = ({
    ensureSignLink,
    forward,
    onLogout,
    onForwardCompleted,
    recheckRejected = false,
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
                onClose={() => setResendOpen(false)}
                onForwarded={(result) => {
                    // Back to the gate, never out of it (JOB7).
                    setResendOpen(false);
                    onForwardCompleted?.(result);
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
            cancelLabelKey="dpaBlocker.logout"
            onConfirm={() => setResendOpen(true)}
            onClose={onLogout}
            // A gate, not a notice: no X, no mask click, no Escape (JOB7).
            closable={false}
            maskClosable={false}
            keyboard={false}
            width={560}
        >
            <div className={styles.body} data-testid="dpa-pending-dialog">
                {recheckRejected && (
                    <Alert severity="warning" role="alert" data-testid="dpa-pending-recheck-rejected">
                        {t('dpaPending.recheckRejected')}
                    </Alert>
                )}
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
