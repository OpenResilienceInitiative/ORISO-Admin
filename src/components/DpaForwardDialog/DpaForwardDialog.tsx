import { useState } from 'react';
import { Form } from 'antd';
import Alert from '@mui/material/Alert';
import ForwardToInboxRounded from '@mui/icons-material/ForwardToInboxRounded';
import LinkRounded from '@mui/icons-material/LinkRounded';
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
import { PlainMailPreview } from './PlainMailPreview';
import { buildForwardMailPreview } from './forwardMailPreview';
import styles from './styles.module.scss';

export interface DpaForwardResult {
    link: DpaForwardLink;
    /** Recipient of the sent mail; null when the link was only copied/shared. */
    recipientEmail: string | null;
    /** The link exists but its mail could not be sent (502). */
    mailFailed: boolean;
}

/**
 * Which surface hosts the dialog. This is not cosmetic: `'admin'` unlocks the
 * backend-rendered branded mail preview, which comes from the ADMIN-ONLY
 * endpoint `POST /service/useradmin/invite-email-templates/preview`.
 *
 * The default is `'public'` — a host that declares nothing gets the plain-text
 * preview, never a logout. See {@link DpaForwardDialogProps.surface}.
 */
export type DpaForwardSurface = 'public' | 'admin';

export interface DpaForwardDialogProps {
    /**
     * Performs the forward. Without `recipientEmail` it mints a link for manual
     * sharing; with one it also sends the `DPA_FORWARD` mail. Called only when
     * the admin actually asks for a link or sends the mail — never on open.
     * Every issued link stays valid until a signature lands, and only five may
     * be outstanding per onboarding, so a call is a resource, not a warm-up.
     */
    forward: (request: { recipientEmail?: string; recipientName?: string }) => Promise<DpaForwardOutcome>;
    onClose: () => void;
    /** Confirms the delegation — the host flips into its forwarded state. */
    onForwarded: (result: DpaForwardResult) => void;
    /**
     * Declares whether the host is an authenticated admin surface.
     *
     * On `'admin'` the mail preview is rendered by the backend's own mail
     * renderer, so the preview and the sent mail cannot drift. On `'public'`
     * (the default) that request is not issued at all: the endpoint is
     * admin-only and answers 401 to an anonymous visitor, and `fetchData` turns
     * a 401 on a credentialled call into refresh → logout → `/admin/login`.
     * That is #712 — the public onboarding visitor was thrown onto the admin
     * login page about half a second after opening this dialog, and could never
     * type a recipient address.
     *
     * Defaulting to `'public'` keeps the failure mode safe: forgetting the prop
     * costs a branded preview, never a session.
     */
    surface?: DpaForwardSurface;
    titleKey?: string;
    descriptionKey?: string;
}

interface RecipientFormValues {
    recipientName: string;
    recipientEmail: string;
}

type LinkState =
    /** Nothing minted yet — opening the dialog costs no link (#712). */
    { kind: 'idle' } | { kind: 'loading' } | { kind: 'ready'; link: DpaForwardLink } | { kind: 'error'; why: string };

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
 * before anything goes out — through the backend's own mail renderer on an
 * admin surface, and as plain text on the public one (see {@link
 * DpaForwardDialogProps.surface}).
 *
 * **Links are minted on demand, never on open (#712).** Only five links may be
 * outstanding per onboarding (14-day TTL) and every issued one stays valid until
 * a signature lands, so minting on mount let five dialog-opens exhaust a tenant's
 * quota without a single mail being sent. A link is therefore created by exactly
 * the two acts that need one: asking for the copyable link, and sending the mail.
 *
 * The 502 case is deliberately NOT a failure: the backend created the link but
 * could not hand the mail to the SMTP server, so the dialog keeps the copyable
 * link and adds a "mail not sent" notice.
 */
export const DpaForwardDialog = ({
    forward,
    onClose,
    onForwarded,
    surface = 'public',
    titleKey = 'dpaForward.dialog.title',
    descriptionKey = 'dpaForward.dialog.description',
}: DpaForwardDialogProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm<RecipientFormValues>();
    const [linkState, setLinkState] = useState<LinkState>({ kind: 'idle' });
    const [sendState, setSendState] = useState<'idle' | 'pending' | 'sent' | 'mail-failed' | 'failed'>('idle');
    const [sendErrorKey, setSendErrorKey] = useState<string>(FAILURE_MESSAGE.TECHNICAL);
    const [sentTo, setSentTo] = useState<string | null>(null);
    const [mailFailed, setMailFailed] = useState(false);
    const [recipientName, setRecipientName] = useState('');

    const link = linkState.kind === 'ready' ? linkState.link : null;

    /**
     * The explicit "I want a link to share myself" act, and the retry for a
     * failed one. Link-only: no recipient, so no mail goes out. Guarded against
     * a double activation because a second call is a second link out of five.
     */
    const requestLink = async () => {
        if (linkState.kind === 'loading') return;
        setLinkState({ kind: 'loading' });
        try {
            const outcome = await forward({});
            setLinkState({ kind: 'ready', link: outcome.link });
        } catch (error) {
            setLinkState({ kind: 'error', why: failureKey(error) });
        }
    };

    const submitEmail = async (values: RecipientFormValues) => {
        if (sendState === 'pending') return;
        setSendState('pending');
        const recipientEmail = values.recipientEmail.trim();
        // The name drives the salutation the preview shows, so it must travel
        // with the send — otherwise the preview promises a greeting the
        // backend cannot deliver (#842). Empty stays absent: the backend's
        // neutral salutation is the truth for that case.
        const trimmedName = values.recipientName?.trim();
        try {
            const outcome = await forward({
                recipientEmail,
                ...(trimmedName ? { recipientName: trimmedName } : {}),
            });
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

                    {/* The branded render is an ADMIN-ONLY backend call. Issuing
                        it from the public wizard 401s and logs the anonymous
                        visitor out (#712), so the public surface previews the
                        wording it composed itself instead. */}
                    <div className={styles.preview}>
{/* The kind is what makes this the FORWARD mail rather than a
                            generic invite. Without it the backend renderer defaults to
                            TENANT_INVITE (`InviteEmailPreviewService`: a null kind falls
                            back to TENANT_INVITE), so the sample call-to-action pointed
                            at the admin console — `admin.oriso.org/admin/tenant-onboarding/…`
                            — while a DPA signer is sent to the app host instead. The
                            house frame around the mail, and with it the footer (brand
                            name, Impressum · Datenschutz, automated-send note), is
                            applied by the backend for every kind; it is not something
                            this dialog composes. */}
                        {surface === 'admin' ? (
                            <EmailKitPreview
                                kind="DPA_FORWARD"
                                subject={preview.subject}
                                body={preview.body}
                                previewLabel={t('dpaForward.dialog.previewLabel')}
                            />
                        ) : (
                            <PlainMailPreview
                                subject={preview.subject}
                                body={preview.body}
                                previewLabel={t('dpaForward.dialog.previewLabel')}
                            />
                        )}
                    </div>
                </div>

                <div className={styles.linkSection} data-testid="dpa-forward-link-section">
                    {/* No link until one is asked for: every mint spends one of
                        the five that may be outstanding per onboarding (#712). */}
                    {linkState.kind === 'idle' && (
                        <div className={styles.linkIdle}>
                            <p className={styles.validityNote}>{t('dpaForward.dialog.linkIntro')}</p>
                            <M3Button variant="tonal" icon={<LinkRounded fontSize="small" />} onClick={requestLink}>
                                {t('dpaForward.dialog.linkCreate')}
                            </M3Button>
                        </div>
                    )}

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
                                <M3Button variant="text" icon={<Refresh fontSize="small" />} onClick={requestLink}>
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
