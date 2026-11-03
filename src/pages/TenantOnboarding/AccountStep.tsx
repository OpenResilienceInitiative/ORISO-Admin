import { Form } from 'antd';
import type { Rule } from 'antd/es/form';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useTranslation } from 'react-i18next';
import { M3Button } from '../../components/M3Button';
import { LocalizedPasswordInput } from '../../components/OnboardingDesign/LocalizedPasswordInput';
import { LocalizedPasswordRuleChips } from '../../components/OnboardingDesign/LocalizedPasswordRuleChips';
import { OnboardingFlow, type OnboardingFlowProps } from '../../components/OnboardingDesign/OnboardingFlow';
import { OnboardingLeadArt } from '../../components/OnboardingDesign/OnboardingLeadArt';
import { OnboardingPageHeader } from '../../components/OnboardingDesign/OnboardingPageHeader';
import { validatePasswordCriteria } from '../../utils/validateInputValue';
import {
    AccountSetupPasswordRejection,
    TenantAdminOnboardingInviteDTO,
} from '../../api/tenantOnboarding/tenantOnboarding';
import styles from './styles.module.scss';

const PASSWORD_REJECTION_KEYS: Record<AccountSetupPasswordRejection, string> = {
    UNCHANGED: 'accountSetup.passwordUnchanged',
    REJECTED: 'accountSetup.passwordRejected',
};

interface AccountStepProps {
    invite: Pick<TenantAdminOnboardingInviteDTO, 'recipientEmail' | 'joinsExistingTenant'>;
    busy: boolean;
    /** Set when the registration failed technically (retryable). */
    showRegistrationError: boolean;
    /** Set when the server refused the chosen password; the link stays usable. */
    passwordRejection?: AccountSetupPasswordRejection | null;
    /** Existing identity: choose a password, without registering an account. */
    existingAccountSetup?: boolean;
    /** Other roles reuse their existing credential policy, rather than inheriting the tenant rule. */
    passwordRules?: Rule[];
    /** Where the person is in a multi-step invite (step 2 of 3 …); omitted for the single-step setup. */
    flow?: OnboardingFlowProps;
    /** Omitted when there is no previous step (joining an existing Träger). */
    onBack?: () => void;
    onSubmit: (password: string) => void;
}

const initialsOf = (email: string) => {
    const local = email.split('@')[0] ?? '';
    const letters = local.replace(/[^\p{L}]/gu, '');
    return letters.slice(0, 2).toUpperCase();
};

/**
 * Step 2 (#571): account creation. The account identity is the invite's
 * recipient address (shown once, read-only); the tenant admin only chooses the
 * password here. Submitting registers the account AND creates the inactive
 * tenant, consuming the ID reservation atomically (see the onboarding client).
 *
 * The page follows the registration step of the app (#1273): one heading, one
 * sentence, a lead graphic or the flow indicator, and the password rules as
 * chips that fill in while typing.
 */
export const AccountStep = ({
    invite,
    busy,
    showRegistrationError,
    passwordRejection = null,
    existingAccountSetup = false,
    passwordRules,
    flow,
    onBack,
    onSubmit,
}: AccountStepProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm<{ password: string; repeatPassword: string }>();
    const password = Form.useWatch('password', form) ?? '';
    const invitationDescriptionKey = invite.joinsExistingTenant
        ? 'tenantOnboarding.account.joinDescription'
        : 'tenantOnboarding.account.description';
    const invitationTitleKey = invite.joinsExistingTenant
        ? 'tenantOnboarding.join.title'
        : 'tenantOnboarding.account.title';
    const titleKey = existingAccountSetup ? 'accountSetup.title' : invitationTitleKey;
    const descriptionKey = existingAccountSetup ? 'accountSetup.description' : invitationDescriptionKey;

    let lead;
    if (flow) {
        lead = <OnboardingFlow {...flow} />;
    } else {
        lead = <OnboardingLeadArt variant="initials" initials={initialsOf(invite.recipientEmail)} />;
    }

    return (
        <Form form={form} layout="vertical" requiredMark={false} onFinish={({ password: next }) => onSubmit(next)}>
            <OnboardingPageHeader
                lead={lead}
                title={t(titleKey)}
                intro={t(descriptionKey)}
                kicker={t('tenantOnboarding.account.email')}
                value={invite.recipientEmail}
            />
            <div className={styles.fieldStack}>
                <Form.Item
                    name="password"
                    style={{ marginBottom: 0 }}
                    rules={[
                        { required: true, message: t('passwordReset.passwordRequired') },
                        ...(passwordRules ?? [
                            {
                                validator: async (_, value) => {
                                    if (value && !validatePasswordCriteria(value)) {
                                        throw new Error(t('passwordReset.passwordInvalid'));
                                    }
                                },
                            },
                        ]),
                    ]}
                >
                    <LocalizedPasswordInput label={t('tenantOnboarding.account.password')} />
                </Form.Item>
                <LocalizedPasswordRuleChips password={password} />
                {passwordRejection && (
                    <Typography role="alert" color="error" variant="body2">
                        {t(PASSWORD_REJECTION_KEYS[passwordRejection])}
                    </Typography>
                )}
                <Form.Item
                    name="repeatPassword"
                    style={{ marginBottom: 0 }}
                    dependencies={['password']}
                    rules={[
                        { required: true, message: t('passwordReset.passwordRequired') },
                        {
                            validator: async (_, value) => {
                                if (value && value !== form.getFieldValue('password')) {
                                    throw new Error(t('passwordReset.passwordMismatch'));
                                }
                            },
                        },
                    ]}
                >
                    <LocalizedPasswordInput label={t('tenantOnboarding.account.repeatPassword')} />
                </Form.Item>
            </div>
            {showRegistrationError && (
                <Typography role="alert" color="error" sx={{ mt: 2 }}>
                    {t(
                        existingAccountSetup
                            ? 'accountSetup.serviceError'
                            : 'tenantOnboarding.account.registrationError',
                    )}
                </Typography>
            )}
            <div className={styles.actions}>
                {onBack && (
                    <M3Button variant="outlined" onClick={onBack} disabled={busy}>
                        {t('tenantOnboarding.back')}
                    </M3Button>
                )}
                <M3Button
                    type="submit"
                    variant="filled"
                    disabled={busy}
                    icon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
                >
                    {t(existingAccountSetup ? 'accountSetup.submit' : 'tenantOnboarding.account.register')}
                </M3Button>
            </div>
        </Form>
    );
};
