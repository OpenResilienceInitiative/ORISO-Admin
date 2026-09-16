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
    /** Link just created by the blocker; avoids minting a duplicate during the transition. */
    initialLink?: DpaForwardLink;
    /** Sends the DPA_FORWARD mail again (or to a different address). */
    forward: (request: { recipientEmail?: string }) => Promise<DpaForwardOutcome>;
    /**
     * "Später", the X, Escape or a mask click. The admin area is already
     * rendered behind the notice (#990), so this only closes it.
     */
    onDismiss: () => void;
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
 * Recurring pending-signature notice (#724, epic #722): shown after each login
 * while the tenant's DPA signature is outstanding after a forward. The admin
 * area is rendered behind it (#990, reverting the JOB7 full lock), so the
 * Träger admin can set up their organisation while they wait — the same
 * experience the tenant-invite wizard gives. Legal-gated writes stay guarded
 * by the backend.
 *
 * It offers what a waiting tenant needs: copy the sign link, send the mail
 * again through the shared forward dialog (#723), or continue ("Später").
 * When the signature lands the gate shows {@link DpaUnlockDialog}.
 */
export const DpaPendingSignatureDialog = ({
    ensureSignLink,
    initialLink,
    forward,
    onDismiss,
    onForwardCompleted,
    recheckRejected = false,
}: DpaPendingSignatureDialogProps) => {
    const { t } = useTranslation();
    const [resendOpen, setResendOpen] = useState(false);
    const [linkState, setLinkState] = useState<LinkState>(
        initialLink ? { kind: 'ready', link: initialLink } : { kind: 'loading' },
    );

    useEffect(() => {
        if (initialLink) return undefined;
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
            cancelLabelKey="dpaPending.later"
            onConfirm={() => setResendOpen(true)}
            onClose={onDismiss}
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
