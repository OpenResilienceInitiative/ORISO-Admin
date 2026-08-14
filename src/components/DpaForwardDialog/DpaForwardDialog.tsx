import { useEffect, useState } from 'react';
import { Form } from 'antd';
import Alert from '@mui/material/Alert';
import ForwardToInboxRounded from '@mui/icons-material/ForwardToInboxRounded';
import Refresh from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { Modal } from '../Modal';
import { M3Button } from '../M3Button';
import { MuiFormField } from '../mui/MuiFormField';
import { EmailKitPreview } from '../PlaceholderTemplate/EmailKitPreview';
import { CopyLinkRow } from './CopyLinkRow';
import styles from './styles.module.scss';

/** The single-use public sign link the delegation runs on. */
export interface DpaForwardLink {
    signLink: string;
    expiresAt: string | null;
}

export interface DpaForwardSendRequest {
    recipientEmail: string;
    recipientName: string;
    link: DpaForwardLink;
}

export interface DpaForwardResult {
    link: DpaForwardLink;
    /** Recipient of the sent mail; null when the link was only copied/shared. */
    recipientEmail: string | null;
}

export interface DpaForwardDialogProps {
    /**
     * Creates (or returns the still-active) sign link when the dialog opens.
     * The surfaces differ only here: the wizard uses the public-token client,
     * the authenticated surfaces the tenant-admin invite endpoint.
     */
    ensureSignLink: () => Promise<DpaForwardLink>;
    /** Sends the DPA_FORWARD mail through the surface-specific transport. */
    sendEmail: (request: DpaForwardSendRequest) => Promise<void>;
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

type LinkState = { kind: 'loading' } | { kind: 'ready'; link: DpaForwardLink } | { kind: 'error' };

/**
 * Shared forward-to-authorised-signer dialog (#723, epic #722) — house M3
 * dialog anatomy. One dialog for every surface that delegates the DPA
 * signature: the public onboarding wizard, the Legal Settings card and the
 * pending-signature dialog's re-send (#724).
 *
 * The sign link is the primary artefact: copyable for any channel, with the
 * note that it stays valid until the contract is signed no matter where it is
 * shared. The e-mail send is optional and shows the actual DPA_FORWARD mail
 * through the e-mail kit preview before anything goes out.
 */
export const DpaForwardDialog = ({
    ensureSignLink,
    sendEmail,
    onClose,
    onForwarded,
    titleKey = 'dpaForward.dialog.title',
    descriptionKey = 'dpaForward.dialog.description',
}: DpaForwardDialogProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm<RecipientFormValues>();
    const [linkState, setLinkState] = useState<LinkState>({ kind: 'loading' });
    const [linkAttempt, setLinkAttempt] = useState(0);
    const [sendState, setSendState] = useState<'idle' | 'pending' | 'sent' | 'failed'>('idle');
    const [sentTo, setSentTo] = useState<string | null>(null);
    const [recipientName, setRecipientName] = useState('');

    useEffect(() => {
        let cancelled = false;
        setLinkState({ kind: 'loading' });
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
        // The callback is stable by contract; re-run only on explicit retry.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [linkAttempt]);

    const link = linkState.kind === 'ready' ? linkState.link : null;

    const submitEmail = async (values: RecipientFormValues) => {
        if (!link || sendState === 'pending') return;
        setSendState('pending');
        try {
            await sendEmail({
                recipientEmail: values.recipientEmail.trim(),
                recipientName: values.recipientName?.trim() ?? '',
                link,
            });
            setSentTo(values.recipientEmail.trim());
            setSendState('sent');
        } catch {
            setSendState('failed');
        }
    };

    // The preview shows the REAL mail: the actual link once it exists, and the
    // salutation the recipient will see. Empty inputs stay visible as
    // unresolved {{token}} chips — the module's contract for "placeholder".
    const previewSubject = t('dpaForward.mail.subject');
    const previewBody = t('dpaForward.mail.body', {
        recipientName: recipientName.trim() || '{{recipientName}}',
        link: link?.signLink ?? '{{link}}',
    });

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
                onForwarded({ link, recipientEmail: sentTo });
            }}
            onClose={onClose}
            width={720}
        >
            <div className={styles.body} data-testid="dpa-forward-dialog">
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
                        {t('dpaForward.dialog.linkError')}
                    </Alert>
                )}

                {link && (
                    <div className={styles.linkSection}>
                        <CopyLinkRow value={link.signLink} />
                        <p className={styles.validityNote} data-testid="dpa-forward-validity-note">
                            {t('dpaForward.dialog.validityNote')}
                        </p>
                    </div>
                )}

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
                        <div className={styles.recipientFields}>
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
                        </div>

                        {sendState === 'sent' && sentTo && (
                            <Alert severity="success" data-testid="dpa-forward-sent" sx={{ mb: 2 }}>
                                {t('dpaForward.dialog.sent', { email: sentTo })}
                            </Alert>
                        )}
                        {sendState === 'failed' && (
                            <Alert severity="error" role="alert" data-testid="dpa-forward-send-failed" sx={{ mb: 2 }}>
                                {t('dpaForward.dialog.sendFailed')}
                            </Alert>
                        )}

                        <M3Button
                            type="submit"
                            variant="outlined"
                            disabled={!link}
                            loading={sendState === 'pending'}
                            icon={<ForwardToInboxRounded fontSize="small" />}
                        >
                            {t('dpaForward.dialog.send')}
                        </M3Button>
                    </Form>

                    <div className={styles.preview}>
                        <EmailKitPreview
                            subject={previewSubject}
                            body={previewBody}
                            previewLabel={t('dpaForward.dialog.previewLabel')}
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default DpaForwardDialog;
