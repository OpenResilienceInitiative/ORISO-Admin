import { useState } from 'react';
import { Form } from 'antd';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { M3Button } from '../../components/M3Button';
import { LocalizedPasswordInput } from '../../components/OnboardingDesign/LocalizedPasswordInput';
import { LocalizedPasswordRuleChips } from '../../components/OnboardingDesign/LocalizedPasswordRuleChips';
import { OnboardingLeadArt } from '../../components/OnboardingDesign/OnboardingLeadArt';
import { OnboardingPageHeader } from '../../components/OnboardingDesign/OnboardingPageHeader';
import { confirmAdminPasswordReset } from '../../api/passwordReset/passwordReset';
import { validatePasswordCriteria } from '../../utils/validateInputValue';
import routePathNames from '../../appConfig';
import { Notify } from '../../components/Notify';

export const PasswordResetConfirmForm = ({ tokenOverride }: { tokenOverride?: string }) => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const token = tokenOverride === undefined ? searchParams.get('token')?.trim() || '' : tokenOverride.trim();
    const [form] = Form.useForm();
    const watchedPassword = Form.useWatch('newPassword', form) ?? '';
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [succeeded, setSucceeded] = useState(false);
    const requestNewLink = (
        <Link to={routePathNames.passwordReset} className="forgotPW">
            {t('passwordReset.requestNewLink')}
        </Link>
    );

    const onFinish = async ({ newPassword }: { newPassword: string }) => {
        setLoading(true);
        setFailed(false);
        try {
            await confirmAdminPasswordReset(token, newPassword);
            setSucceeded(true);
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="loginForm">
                <OnboardingPageHeader
                    lead={<OnboardingLeadArt variant="clock" />}
                    title={t('passwordReset.invalidTitle')}
                    intro={t('passwordReset.invalidDescription')}
                />
                {requestNewLink}
            </div>
        );
    }

    if (succeeded) {
        return (
            <div className="loginForm">
                <OnboardingPageHeader
                    lead={<OnboardingLeadArt variant="check" />}
                    title={t('passwordReset.successTitle')}
                    intro={t('passwordReset.successDescription')}
                />
                <Typography sx={{ mb: 4 }}>{t('passwordReset.successDescription.counsellorHint')}</Typography>
                <Link to={routePathNames.login} className="forgotPW">
                    {t('passwordReset.backToLogin')}
                </Link>
            </div>
        );
    }

    return (
        <div className="loginForm">
            <Form className="passwordResetForm" form={form} onFinish={onFinish} layout="vertical" requiredMark={false}>
                <OnboardingPageHeader
                    lead={<OnboardingLeadArt variant="refresh" />}
                    title={t('passwordReset.confirmTitle')}
                />
                <Form.Item
                    name="newPassword"
                    style={{ marginBottom: 0 }}
                    rules={[
                        { required: true, message: t('passwordReset.passwordRequired') },
                        {
                            validator: async (_, value) => {
                                if (value && !validatePasswordCriteria(value)) {
                                    throw new Error(t('passwordReset.passwordInvalid'));
                                }
                            },
                        },
                    ]}
                >
                    <LocalizedPasswordInput label={t('passwordReset.newPassword')} />
                </Form.Item>
                <LocalizedPasswordRuleChips password={watchedPassword} />
                <Form.Item
                    name="repeatPassword"
                    style={{ marginBottom: 0 }}
                    dependencies={['newPassword']}
                    rules={[
                        { required: true, message: t('passwordReset.passwordRequired') },
                        {
                            validator: async (_, value) => {
                                if (value && value !== form.getFieldValue('newPassword')) {
                                    throw new Error(t('passwordReset.passwordMismatch'));
                                }
                            },
                        },
                    ]}
                >
                    <LocalizedPasswordInput label={t('passwordReset.repeatPassword')} />
                </Form.Item>
                {failed && (
                    <>
                        <Notify title={t('notify.title.passwordReset')} severity="error">
                            {t('passwordReset.confirmError')}
                        </Notify>
                        {requestNewLink}
                    </>
                )}
                <div style={{ marginTop: 24 }}>
                    <M3Button
                        type="submit"
                        variant="filled"
                        block
                        disabled={loading}
                        icon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
                    >
                        {t('passwordReset.setPassword')}
                    </M3Button>
                </div>
            </Form>
        </div>
    );
};
