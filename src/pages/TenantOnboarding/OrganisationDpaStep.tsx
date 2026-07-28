import { useMemo, useState } from 'react';
import { Form } from 'antd';
import DOMPurify from 'dompurify';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { M3Button } from '../../components/M3Button';
import { M3Checkbox } from '../../components/M3Checkbox';
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

/**
 * Step 1 (#571): organisation master data plus the EXISTING DPA/AVV form —
 * the published DPA text (language -> HTML map, same storage format the legal
 * settings use) is rendered read-only via the shared legal-content helpers,
 * and the signer fields mirror the established `DpaSignature` shape
 * (src/types/dpa.ts). No legal wording is authored here.
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

    const dpaHtml = useMemo(
        () => DOMPurify.sanitize(pickLegalContentLanguage(invite.dpaContent, i18n.language)),
        [invite.dpaContent, i18n.language],
    );

    const onFinish = (values: OrganisationDpaFormValues) => {
        if (!dpaAccepted) {
            setAcceptTouched(true);
            return;
        }
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

    return (
        <Form
            form={form}
            layout="vertical"
            requiredMark={false}
            onFinish={onFinish}
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

            <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mt: 4, mb: 1 }}>
                {t('tenantOnboarding.dpa.title')}
            </Typography>
            <Typography sx={{ mb: 2 }} color="text.secondary">
                {t('tenantOnboarding.dpa.description')}
            </Typography>
            {dpaHtml ? (
                <div
                    className={styles.dpaText}
                    data-testid="dpa-text"
                    // Scrollable text region: axe (scrollable-region-focusable)
                    // requires keyboard focusability so the DPA can be scrolled
                    // without a pointer.
                    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
                    tabIndex={0}
                    role="region"
                    aria-label={t('tenantOnboarding.dpa.title')}
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: dpaHtml }}
                />
            ) : (
                <Typography sx={{ mb: 2 }}>{t('tenantOnboarding.dpa.missing')}</Typography>
            )}
            <div className={styles.fieldStack}>
                <MuiFormField
                    name="signerName"
                    label={t('tenantOnboarding.dpa.signerName')}
                    rules={[{ required: true, whitespace: true, message: t('tenantOnboarding.validation.required') }]}
                />
                <MuiFormField
                    name="signerPosition"
                    label={t('tenantOnboarding.dpa.signerPosition')}
                    rules={[{ required: true, whitespace: true, message: t('tenantOnboarding.validation.required') }]}
                />
                <MuiFormField
                    name="signerEmail"
                    label={t('tenantOnboarding.dpa.signerEmail')}
                    rules={[
                        { required: true, whitespace: true, message: t('tenantOnboarding.validation.required') },
                        { type: 'email', message: t('tenantOnboarding.validation.email') },
                    ]}
                />
                <MuiFormField
                    name="signerOrganisation"
                    label={t('tenantOnboarding.dpa.signerOrganisation')}
                    rules={[{ required: true, whitespace: true, message: t('tenantOnboarding.validation.required') }]}
                />
            </div>

            <div className={styles.acceptRow}>
                <M3Checkbox
                    checked={dpaAccepted}
                    label={t('tenantOnboarding.dpa.accept')}
                    onChange={(value) => {
                        setDpaAccepted(value);
                        setAcceptTouched(true);
                    }}
                />
                <Typography
                    component="span"
                    className={styles.acceptLabel}
                    onClick={() => {
                        setDpaAccepted((value) => !value);
                        setAcceptTouched(true);
                    }}
                >
                    {t('tenantOnboarding.dpa.accept')}
                </Typography>
            </div>
            {acceptTouched && !dpaAccepted && (
                <Typography role="alert" color="error" variant="body2" sx={{ mt: 1 }}>
                    {t('tenantOnboarding.dpa.acceptRequired')}
                </Typography>
            )}

            <div className={styles.actions}>
                <M3Button type="submit" variant="filled" block>
                    {t('tenantOnboarding.continue')}
                </M3Button>
            </div>
        </Form>
    );
};
