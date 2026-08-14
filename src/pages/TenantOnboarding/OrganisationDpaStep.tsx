import { useMemo, useState } from 'react';
import { Form } from 'antd';
import classNames from 'classnames';
import type { ValidateErrorEntity } from 'rc-field-form/lib/interface';
import DOMPurify from 'dompurify';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import ArrowForward from '@mui/icons-material/ArrowForward';
import ForwardToInboxRounded from '@mui/icons-material/ForwardToInboxRounded';
import HourglassTopRounded from '@mui/icons-material/HourglassTopRounded';
import { useTranslation } from 'react-i18next';
import { DpaFormSection, focusDpaConsent } from '../../components/DpaLegalForm/DpaFormSection';
import { DpaLegalReader } from '../../components/DpaLegalForm/DpaLegalReader';
import { DpaForwardDialog } from '../../components/DpaForwardDialog/DpaForwardDialog';
import { M3Button } from '../../components/M3Button';
import { MuiFormField } from '../../components/mui/MuiFormField';
import { focusFirstInvalidField } from '../../utils/formErrorNavigation';
import { pickLegalContentLanguage } from '../../components/Tenants/LegalSettings/utils/legalContentLanguages';
import {
    DpaAcceptanceData,
    OrganisationData,
    TenantAdminOnboardingInviteDTO,
} from '../../api/tenantOnboarding/tenantOnboarding';
import { DpaForwardClient, resolveDpaForwardSignLink } from '../../api/tenantOnboarding/dpaForward';
import { WizardDpaForwardState } from './useTenantAdminOnboardingFlow';
import styles from './styles.module.scss';

interface OrganisationDpaStepProps {
    invite: TenantAdminOnboardingInviteDTO;
    /** Previously entered values when navigating back from the account step. */
    initialOrganisation: OrganisationData | null;
    initialDpa: DpaAcceptanceData | null;
    /** Declared delegation (#723) — the step renders the calm on-hold state. */
    forward: WizardDpaForwardState | null;
    /** Raw invite token — the only credential of the public forward endpoints. */
    inviteToken: string;
    forwardClient: DpaForwardClient;
    onForwarded: (forward: WizardDpaForwardState) => void;
    onSubmit: (organisation: OrganisationData, dpa: DpaAcceptanceData | null) => void;
}

interface OrganisationDpaFormValues {
    name: string;
    subdomain: string;
    address: string;
    signerName: string;
    signerPosition: string;
    signerEmail: string;
    signerOrganisation: string;
}

/** Why the last submit did not go through — surfaced AT the button (#594.6). */
type SubmitBlocker = 'fields' | 'consent' | 'dpa';

const BLOCKER_MESSAGE: Record<SubmitBlocker, string> = {
    fields: 'tenantOnboarding.validation.incomplete',
    consent: 'tenantOnboarding.dpa.acceptRequired',
    dpa: 'tenantOnboarding.dpa.unavailableBlocked',
};

/**
 * antd prefixes the id of every bound control with the form name, and the
 * jump-to-the-invalid-field lookup resolves exactly that id — so the two must
 * agree. A name also keeps generic ids like `name`/`address` out of the public
 * page's global id space.
 */
const FORM_NAME = 'tenantOnboarding';

/**
 * Step 1 (#571): organisation master data plus the EXISTING DPA/AVV form —
 * the published DPA text (language -> HTML map, same storage format the legal
 * settings use) is rendered read-only through the canonical rich-text reader
 * with its chapter chips, and the signer fields mirror the established
 * `DpaSignature` shape (src/types/dpa.ts). No legal wording is authored here.
 *
 * A failed submit never dead-ends (#594.6): the reason appears next to the
 * button that was just pressed, and the flow jumps to whatever is missing —
 * the first invalid field, or the consent act.
 *
 * Forward path (#723, epic #722): an administrator who is not authorised to
 * sign delegates through the forward dialog. The step then flips to a calm
 * on-hold state — no signer fields, no consent — and the wizard continues
 * with the organisation data alone; the register call carries the forwarded
 * state instead of a self-signature.
 */
export const OrganisationDpaStep = ({
    invite,
    initialOrganisation,
    initialDpa,
    forward,
    inviteToken,
    forwardClient,
    onForwarded,
    onSubmit,
}: OrganisationDpaStepProps) => {
    const { t, i18n } = useTranslation();
    const [form] = Form.useForm<OrganisationDpaFormValues>();
    const [dpaAccepted, setDpaAccepted] = useState(initialDpa?.accepted ?? false);
    const [acceptTouched, setAcceptTouched] = useState(false);
    const [submitBlocker, setSubmitBlocker] = useState<SubmitBlocker | null>(null);
    const [forwardDialogOpen, setForwardDialogOpen] = useState(false);

    const dpaHtml = useMemo(
        () => DOMPurify.sanitize(pickLegalContentLanguage(invite.dpaContent, i18n.language)),
        [invite.dpaContent, i18n.language],
    );

    /**
     * The agreement did not load (no published content, no content for any
     * language, or everything stripped by the sanitiser). There is then no
     * text for the user to agree to, so the step cannot be completed at all —
     * `DpaFormSection` withholds the consent control and this refuses the
     * submit, mirroring `DpaBlocker`, which never offers a signature without
     * content either.
     */
    const dpaUnavailable = !dpaHtml;

    const forwarded = forward !== null;

    const onFinish = (values: OrganisationDpaFormValues) => {
        const organisation: OrganisationData = {
            name: values.name.trim(),
            subdomain: values.subdomain.trim(),
            address: values.address.trim(),
        };
        if (forwarded) {
            // The delegation replaces the consent act — the signature arrives
            // through the sign link; only the organisation data is submitted.
            setSubmitBlocker(null);
            onSubmit(organisation, null);
            return;
        }
        if (dpaUnavailable) {
            setSubmitBlocker('dpa');
            return;
        }
        if (!dpaAccepted) {
            setAcceptTouched(true);
            setSubmitBlocker('consent');
            focusDpaConsent();
            return;
        }
        setSubmitBlocker(null);
        onSubmit(organisation, {
            accepted: true,
            signerName: values.signerName.trim(),
            signerPosition: values.signerPosition.trim(),
            signerEmail: values.signerEmail.trim(),
            signerOrganisation: values.signerOrganisation.trim(),
        });
    };

    const onFinishFailed = ({ errorFields }: ValidateErrorEntity<OrganisationDpaFormValues>) => {
        // The consent state is part of "incomplete" as well — show its own
        // inline error from now on, whatever else is missing.
        setAcceptTouched(true);
        setSubmitBlocker(dpaUnavailable && !forwarded ? 'dpa' : 'fields');
        // Actually move the viewport AND the caret to what is missing. antd's
        // own `scrollToField` silently did nothing here (#594.6 review).
        if (!focusFirstInvalidField(errorFields, FORM_NAME) && !forwarded && !dpaAccepted) {
            focusDpaConsent();
        }
    };

    return (
        <>
            <Form
                form={form}
                name={FORM_NAME}
                layout="vertical"
                requiredMark={false}
                onFinish={onFinish}
                onFinishFailed={onFinishFailed}
                onValuesChange={() => setSubmitBlocker(null)}
                initialValues={{
                    name: initialOrganisation?.name ?? '',
                    subdomain: initialOrganisation?.subdomain ?? '',
                    address: initialOrganisation?.address ?? '',
                    signerName: initialDpa?.signerName ?? [invite.firstName, invite.lastName].filter(Boolean).join(' '),
                    signerPosition: initialDpa?.signerPosition ?? '',
                    signerEmail: initialDpa?.signerEmail ?? invite.recipientEmail,
                    // The slot is a free note now, not the organisation name — seeding it
                    // from the field three rows up is exactly the duplication that went.
                    signerOrganisation: initialDpa?.signerOrganisation ?? '',
                }}
            >
                <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 1 }}>
                    {t('tenantOnboarding.organisation.title')}
                </Typography>
                <Typography sx={{ mb: 2 }} color="text.secondary">
                    {t('tenantOnboarding.organisation.description', { tenantId: invite.reservedTenantId })}
                </Typography>
                <div className={classNames(styles.fieldStack, styles.fieldStackPaired)}>
                    <MuiFormField
                        name="name"
                        label={t('tenantOnboarding.organisation.name')}
                        rules={[
                            { required: true, whitespace: true, message: t('tenantOnboarding.validation.required') },
                        ]}
                    />
                    <MuiFormField
                        name="subdomain"
                        label={t('tenantOnboarding.organisation.subdomain')}
                        rules={[
                            { required: true, whitespace: true, message: t('tenantOnboarding.validation.required') },
                            {
                                pattern: /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
                                message: t('tenantOnboarding.validation.subdomain'),
                            },
                        ]}
                    />
                    <MuiFormField
                        name="address"
                        label={t('tenantOnboarding.organisation.address')}
                        rules={[
                            { required: true, whitespace: true, message: t('tenantOnboarding.validation.required') },
                        ]}
                    />
                </div>

                <div className={styles.dpaBlock}>
                    {forwarded ? (
                        <>
                            {/* On hold, not an error (#723): the delegation IS the
                                valid completion of this step; the agreement stays
                                readable while the signer fields and the consent
                                act are withdrawn. */}
                            <Alert severity="success" data-testid="dpa-forwarded-notice" sx={{ mb: 2 }}>
                                {t('tenantOnboarding.dpa.forwarded.notice')}
                            </Alert>
                            {!dpaUnavailable && (
                                <DpaLegalReader
                                    html={dpaHtml}
                                    label={t('tenantOnboarding.dpa.title')}
                                    contentLanguage={i18n.language}
                                />
                            )}
                            <div className={styles.forwardOnHold} data-testid="dpa-forwarded-onhold">
                                <HourglassTopRounded aria-hidden className={styles.forwardOnHoldIcon} />
                                <div>
                                    <p className={styles.forwardOnHoldTitle}>
                                        {t('tenantOnboarding.dpa.forwarded.title')}
                                    </p>
                                    <p className={styles.forwardOnHoldText}>
                                        {t('tenantOnboarding.dpa.forwarded.description')}
                                    </p>
                                    {forward?.recipientEmail && (
                                        <p className={styles.forwardOnHoldText} data-testid="dpa-forwarded-sent-to">
                                            {t('tenantOnboarding.dpa.forwarded.sentTo', {
                                                email: forward.recipientEmail,
                                            })}
                                        </p>
                                    )}
                                    <M3Button
                                        variant="text"
                                        icon={<ForwardToInboxRounded fontSize="small" />}
                                        onClick={() => setForwardDialogOpen(true)}
                                    >
                                        {t('tenantOnboarding.dpa.forwarded.showLink')}
                                    </M3Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <DpaFormSection
                                dpaHtml={dpaHtml}
                                textLabel={t('tenantOnboarding.dpa.title')}
                                textDescription={t('tenantOnboarding.dpa.description')}
                                accepted={dpaAccepted}
                                acceptTouched={acceptTouched}
                                onAcceptedChange={(value) => {
                                    // Belt and braces: the control is not rendered without
                                    // an agreement, so this cannot fire — and if a future
                                    // host ever renders one, it still cannot set consent.
                                    if (dpaUnavailable) return;
                                    setDpaAccepted(value);
                                    setAcceptTouched(true);
                                    if (value) setSubmitBlocker(null);
                                }}
                            />
                            {/* The second path (#723): visible without completing the
                                signature form, directly below the consent act. */}
                            <div className={styles.forwardAction}>
                                <M3Button
                                    variant="text"
                                    icon={<ForwardToInboxRounded fontSize="small" />}
                                    onClick={() => setForwardDialogOpen(true)}
                                >
                                    {t('dpaForward.action.notAuthorised')}
                                </M3Button>
                            </div>
                        </>
                    )}
                </div>

                {submitBlocker && (
                    <Alert severity="error" role="alert" data-testid="onboarding-submit-error" sx={{ mt: 3 }}>
                        {t(BLOCKER_MESSAGE[submitBlocker])}
                    </Alert>
                )}

                <div className={styles.actions}>
                    {/* Every action on these surfaces carries its icon — the
                        blocker's do, so the primary here must too (#594 review). */}
                    <M3Button type="submit" variant="filled" block icon={<ArrowForward fontSize="small" />}>
                        {t('tenantOnboarding.continue')}
                    </M3Button>
                </div>
            </Form>

            {forwardDialogOpen && (
                <DpaForwardDialog
                    ensureSignLink={async () => {
                        const created = await forwardClient.createForwardInvite(inviteToken);
                        return { signLink: resolveDpaForwardSignLink(created.signLink), expiresAt: created.expiresAt };
                    }}
                    sendEmail={({ recipientEmail, recipientName }) =>
                        forwardClient.sendForwardEmail(inviteToken, { recipientEmail, recipientName })
                    }
                    onClose={() => setForwardDialogOpen(false)}
                    onForwarded={({ link, recipientEmail }) => {
                        setForwardDialogOpen(false);
                        onForwarded({ signLink: link.signLink, expiresAt: link.expiresAt, recipientEmail });
                    }}
                />
            )}
        </>
    );
};
