import { useEffect, useState } from 'react';
import { Form } from 'antd';
import Alert from '@mui/material/Alert';
import ForwardToInboxRounded from '@mui/icons-material/ForwardToInboxRounded';
import Refresh from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { Modal } from '../Modal';
import { M3Button } from '../M3Button';
import { FieldGrid } from '../FieldGrid';
import { MuiFormField } from '../mui/MuiFormField';
import { EmailKitPreview } from '../PlaceholderTemplate/EmailKitPreview';
import {
    DpaForwardError,
    DpaForwardFailureKind,
    DpaForwardLink,
    DpaForwardOutcome,
} from '../../api/tenantOnboarding/dpaForward';
import { CopyLinkRow } from './CopyLinkRow';
import { buildForwardMailPreview } from './forwardMailPreview';
import styles from './styles.module.scss';

export interface DpaForwardResult {
    link: DpaForwardLink;
    /** Recipient of the sent mail; null when the link was only copied/shared. */
    recipientEmail: string | null;
    /** The link exists but its mail could not be sent (502). */
    mailFailed: boolean;
}

export interface DpaForwardDialogProps {
    /**
     * Performs the forward. Without `recipientEmail` it only mints a link for
     * manual sharing; with one it also sends the `DPA_FORWARD` mail. Called
     * once on open (link-only) and again per send — every issued link stays
     * valid until a signature lands.
     */
    forward: (request: { recipientEmail?: string }) => Promise<DpaForwardOutcome>;
    onClose: () => void;
    /** Confirms the delegation — the host flips into its forwarded state. */
    onForwarded: (result: DpaForwardResult) => void;
    titleKey?: string;
    descriptionKey?: string;
}

interface RecipientFormValues {
    recipientName: string;
    recipientEmail: string;
}

type LinkState = { kind: 'loading' } | { kind: 'ready'; link: DpaForwardLink } | { kind: 'error'; why: string };

/** i18n key for a typed backend failure. */
const FAILURE_MESSAGE: Record<DpaForwardFailureKind, string> = {
    UNKNOWN_TOKEN: 'dpaForward.dialog.errorUnknownToken',
    NO_DPA_PUBLISHED: 'dpaForward.dialog.errorNoDpaPublished',
    TOO_MANY_LINKS: 'dpaForward.dialog.errorTooManyLinks',
    TECHNICAL: 'dpaForward.dialog.linkError',
};

const failureKey = (error: unknown): string =>
    error instanceof DpaForwardError ? FAILURE_MESSAGE[error.kind] : FAILURE_MESSAGE.TECHNICAL;

/**
 * Shared forward-to-authorised-signer dialog (#723, epic #722) — house M3
 * dialog anatomy. One dialog for every surface that delegates the DPA
 * signature: the public onboarding wizard, the Legal Settings card and the
 * pending-signature dialog (#724).
 *
 * The sign link is the primary artefact: copyable for any channel, with the
 * note that it stays valid until the contract is signed no matter where it is
 * shared. The e-mail send is optional and shows the actual DPA_FORWARD mail
 * through the e-mail kit preview before anything goes out.
 *
 * The 502 case is deliberately NOT a failure: the backend created the link but
 * could not hand the mail to the SMTP server, so the dialog keeps the copyable
 * link and adds a "mail not sent" notice.
 */
export const DpaForwardDialog = ({
    forward,
    onClose,
    onForwarded,
    titleKey = 'dpaForward.dialog.title',
    descriptionKey = 'dpaForward.dialog.description',
}: DpaForwardDialogProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm<RecipientFormValues>();
    const [linkState, setLinkState] = useState<LinkState>({ kind: 'loading' });
    const [linkAttempt, setLinkAttempt] = useState(0);
    const [sendState, setSendState] = useState<'idle' | 'pending' | 'sent' | 'mail-failed' | 'failed'>('idle');
    const [sendErrorKey, setSendErrorKey] = useState<string>(FAILURE_MESSAGE.TECHNICAL);
    const [sentTo, setSentTo] = useState<string | null>(null);
    const [mailFailed, setMailFailed] = useState(false);
    const [recipientName, setRecipientName] = useState('');

    useEffect(() => {
        let cancelled = false;
        setLinkState({ kind: 'loading' });
        // Link-only call: no recipient, so no mail goes out yet.
        forward({})
            .then((outcome) => {
                if (!cancelled) setLinkState({ kind: 'ready', link: outcome.link });
            })
            .catch((error: unknown) => {
                if (!cancelled) setLinkState({ kind: 'error', why: failureKey(error) });
            });
        return () => {
            cancelled = true;
        };
        // The callback is stable by contract; re-run only on explicit retry.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [linkAttempt]);

    const link = linkState.kind === 'ready' ? linkState.link : null;

    const submitEmail = async (values: RecipientFormValues) => {
        if (sendState === 'pending') return;
        setSendState('pending');
        const recipientEmail = values.recipientEmail.trim();
        try {
            const outcome = await forward({ recipientEmail });
            // The send issues a fresh link — show THAT one, so the link the
            // admin copies is the newest of the still-valid set.
            setLinkState({ kind: 'ready', link: outcome.link });
            setSentTo(outcome.mailFailed ? null : recipientEmail);
            setMailFailed(outcome.mailFailed);
            setSendState(outcome.mailFailed ? 'mail-failed' : 'sent');
        } catch (error) {
            setSendErrorKey(failureKey(error));
            setSendState('failed');
        }
    };

    // The preview shows the REAL mail: the actual link once it exists, and the
    // salutation the recipient will see — never a raw {{token}}.
    const preview = buildForwardMailPreview(t, { recipientName, signUrl: link?.signUrl ?? null });

    return (
        <Modal
            titleKey={titleKey}
            descriptionKey={descriptionKey}
            icon={<ForwardToInboxRounded fontSize="inherit" />}
            okLabelKey="dpaForward.dialog.confirm"
            cancelLabelKey="cancel"
            confirmDisabled={!link}
            onConfirm={() => {
                if (!link) return;
                onForwarded({ link, recipientEmail: sentTo, mailFailed });
            }}
            onClose={onClose}
            className={styles.dialog}
            width={880}
        >
            <div className={styles.body} data-testid="dpa-forward-dialog">
                {/* The mail comes first: it is the worked example of what the
                    recipient receives. The link block below it is the
                    alternative for anyone who would rather share it themselves. */}
                <div className={styles.emailSection}>
                    <h3 className={styles.sectionTitle}>{t('dpaForward.dialog.emailSectionTitle')}</h3>
                    <Form<RecipientFormValues>
                        form={form}
                        name="dpaForwardEmail"
                        layout="vertical"
                        requiredMark={false}
                        onFinish={submitEmail}
                        onValuesChange={(_, values) => {
                            setRecipientName(values.recipientName ?? '');
                            if (sendState === 'failed') setSendState('idle');
                        }}
                        initialValues={{ recipientName: '', recipientEmail: '' }}
                    >
                        {/* Name and address share one row wherever the sheet is
                            wide enough for two 240px tracks, and stack below it. */}
                        <FieldGrid minColumnWidth={240} maxColumns={2}>
                            <MuiFormField name="recipientName" label={t('dpaForward.dialog.recipientName')} />
                            <MuiFormField
                                name="recipientEmail"
                                label={t('dpaForward.dialog.recipientEmail')}
                                type="email"
                                rules={[
                                    {
                                        required: true,
                                        whitespace: true,
                                        message: t('tenantOnboarding.validation.required'),
                                    },
                                    { type: 'email', message: t('tenantOnboarding.validation.email') },
                                ]}
                            />
                        </FieldGrid>

                        {sendState === 'sent' && sentTo && (
                            <Alert severity="success" data-testid="dpa-forward-sent" sx={{ mb: 2 }}>
                                {t('dpaForward.dialog.sent', { email: sentTo })}
                            </Alert>
                        )}
                        {/* 502: the link exists — a warning, never an error. */}
                        {sendState === 'mail-failed' && (
                            <Alert severity="warning" data-testid="dpa-forward-mail-failed" sx={{ mb: 2 }}>
                                {t('dpaForward.dialog.mailFailedLinkReady')}
                            </Alert>
                        )}
                        {sendState === 'failed' && (
                            <Alert severity="error" role="alert" data-testid="dpa-forward-send-failed" sx={{ mb: 2 }}>
                                {t(sendErrorKey)}
                            </Alert>
                        )}

                        {/* The section's own primary action: filled, and on the
                            trailing edge where the sheet's actions live. */}
                        <div className={styles.sendActions}>
                            <M3Button
                                type="submit"
                                variant="filled"
                                loading={sendState === 'pending'}
                                icon={<ForwardToInboxRounded fontSize="small" />}
                            >
                                {t('dpaForward.dialog.send')}
                            </M3Button>
                        </div>
                    </Form>

                    <div className={styles.preview}>
                        <EmailKitPreview
                            subject={preview.subject}
                            body={preview.body}
                            previewLabel={t('dpaForward.dialog.previewLabel')}
                        />
                    </div>
                </div>

                <div className={styles.linkSection} data-testid="dpa-forward-link-section">
                    {linkState.kind === 'loading' && (
                        <p className={styles.linkPending} role="status">
                            {t('dpaForward.dialog.linkPending')}
                        </p>
                    )}

                    {linkState.kind === 'error' && (
                        <Alert
                            severity="error"
                            role="alert"
                            data-testid="dpa-forward-link-error"
                            action={
                                <M3Button
                                    variant="text"
                                    icon={<Refresh fontSize="small" />}
                                    onClick={() => setLinkAttempt((attempt) => attempt + 1)}
                                >
                                    {t('dpaForward.dialog.linkRetry')}
                                </M3Button>
                            }
                        >
                            {t(linkState.why)}
                        </Alert>
                    )}

                    {link && (
                        <>
                            <CopyLinkRow value={link.signUrl} />
                            <p className={styles.validityNote} data-testid="dpa-forward-validity-note">
                                {t('dpaForward.dialog.validityNote')}
                            </p>
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default DpaForwardDialog;
