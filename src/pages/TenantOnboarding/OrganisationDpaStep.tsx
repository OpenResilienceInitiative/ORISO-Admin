import { useMemo, useState } from 'react';
import { Form } from 'antd';
import type { ValidateErrorEntity } from 'rc-field-form/lib/interface';
import DOMPurify from 'dompurify';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { DpaFormSection, focusDpaConsent } from '../../components/DpaLegalForm/DpaFormSection';
import { M3Button } from '../../components/M3Button';
import { MuiFormField } from '../../components/mui/MuiFormField';
import { pickLegalContentLanguage } from '../../components/Tenants/LegalSettings/utils/legalContentLanguages';
import {
    DpaAcceptanceData,
    OrganisationData,
    TenantAdminOnboardingInviteDTO,
} from '../../api/tenantOnboarding/tenantOnboarding';
import styles from './styles.module.scss';

interface OrganisationDpaStepProps {
    invite: TenantAdminOnboardingInviteDTO;
    /** Previously entered values when navigating back from the account step. */
    initialOrganisation: OrganisationData | null;
    initialDpa: DpaAcceptanceData | null;
    onSubmit: (organisation: OrganisationData, dpa: DpaAcceptanceData) => void;
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
type SubmitBlocker = 'fields' | 'consent';

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
 */
export const OrganisationDpaStep = ({
    invite,
    initialOrganisation,
    initialDpa,
    onSubmit,
}: OrganisationDpaStepProps) => {
    const { t, i18n } = useTranslation();
    const [form] = Form.useForm<OrganisationDpaFormValues>();
    const [dpaAccepted, setDpaAccepted] = useState(initialDpa?.accepted ?? false);
    const [acceptTouched, setAcceptTouched] = useState(false);
    const [submitBlocker, setSubmitBlocker] = useState<SubmitBlocker | null>(null);

    const dpaHtml = useMemo(
        () => DOMPurify.sanitize(pickLegalContentLanguage(invite.dpaContent, i18n.language)),
        [invite.dpaContent, i18n.language],
    );

    const onFinish = (values: OrganisationDpaFormValues) => {
        if (!dpaAccepted) {
            setAcceptTouched(true);
            setSubmitBlocker('consent');
            focusDpaConsent();
            return;
        }
        setSubmitBlocker(null);
        onSubmit(
            { name: values.name.trim(), subdomain: values.subdomain.trim(), address: values.address.trim() },
            {
                accepted: true,
                signerName: values.signerName.trim(),
                signerPosition: values.signerPosition.trim(),
                signerEmail: values.signerEmail.trim(),
                signerOrganisation: values.signerOrganisation.trim(),
            },
        );
    };

    const onFinishFailed = ({ errorFields }: ValidateErrorEntity<OrganisationDpaFormValues>) => {
        // The consent state is part of "incomplete" as well — show its own
        // inline error from now on, whatever else is missing.
        setAcceptTouched(true);
        setSubmitBlocker('fields');
        const first = errorFields[0]?.name;
        if (first) {
            form.scrollToField(first, { block: 'center' });
        }
    };

    return (
        <Form
            form={form}
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
                signerOrganisation: initialDpa?.signerOrganisation ?? initialOrganisation?.name ?? '',
            }}
        >
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 1 }}>
                {t('tenantOnboarding.organisation.title')}
            </Typography>
            <Typography sx={{ mb: 2 }} color="text.secondary">
                {t('tenantOnboarding.organisation.description', { tenantId: invite.reservedTenantId })}
            </Typography>
            <div className={styles.fieldStack}>
                <MuiFormField
                    name="name"
                    label={t('tenantOnboarding.organisation.name')}
                    rules={[{ required: true, whitespace: true, message: t('tenantOnboarding.validation.required') }]}
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
                    rules={[{ required: true, whitespace: true, message: t('tenantOnboarding.validation.required') }]}
                />
            </div>

            <div className={styles.dpaBlock}>
                {!dpaHtml && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {t('tenantOnboarding.dpa.missing')}
                    </Alert>
                )}
                <DpaFormSection
                    dpaHtml={dpaHtml}
                    textLabel={t('tenantOnboarding.dpa.title')}
                    textDescription={t('tenantOnboarding.dpa.description')}
                    accepted={dpaAccepted}
                    acceptTouched={acceptTouched}
                    onAcceptedChange={(value) => {
                        setDpaAccepted(value);
                        setAcceptTouched(true);
                        if (value) setSubmitBlocker(null);
                    }}
                />
            </div>

            {submitBlocker && (
                <Alert severity="error" role="alert" data-testid="onboarding-submit-error" sx={{ mt: 3 }}>
                    {t(
                        submitBlocker === 'consent'
                            ? 'tenantOnboarding.dpa.acceptRequired'
                            : 'tenantOnboarding.validation.incomplete',
                    )}
                </Alert>
            )}

            <div className={styles.actions}>
                <M3Button type="submit" variant="filled" block>
                    {t('tenantOnboarding.continue')}
                </M3Button>
            </div>
        </Form>
    );
};
