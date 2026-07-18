import { useState } from 'react';
import { Form } from 'antd';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { MuiPasswordFormField } from '../../components/mui/MuiFormField';
import { confirmAdminPasswordReset } from '../../api/passwordReset/passwordReset';
import { validatePasswordCriteria } from '../../utils/validateInputValue';
import routePathNames from '../../appConfig';

export const PasswordResetConfirmForm = ({ tokenOverride }: { tokenOverride?: string }) => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const token = tokenOverride === undefined ? searchParams.get('token')?.trim() || '' : tokenOverride.trim();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [succeeded, setSucceeded] = useState(false);

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

    if (!token || failed) {
        return (
            <div className="loginForm">
                <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 3 }}>
                    {t('passwordReset.invalidTitle')}
                </Typography>
                <Typography role="alert" sx={{ mb: 4 }}>
                    {t('passwordReset.invalidDescription')}
                </Typography>
                <a href={routePathNames.passwordReset} className="forgotPW">
                    {t('passwordReset.requestNewLink')}
                </a>
            </div>
        );
    }

    if (succeeded) {
        return (
            <div className="loginForm">
                <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 3 }}>
                    {t('passwordReset.successTitle')}
                </Typography>
                <Typography sx={{ mb: 4 }}>{t('passwordReset.successDescription')}</Typography>
                <a href={routePathNames.login} className="forgotPW">
                    {t('passwordReset.backToLogin')}
                </a>
            </div>
        );
    }

    return (
        <div className="loginForm">
            <Form className="passwordResetForm" form={form} onFinish={onFinish} layout="vertical" requiredMark={false}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
                    {t('passwordReset.confirmTitle')}
                </Typography>
                <Typography sx={{ mb: 3 }}>{t('passwordReset.passwordCriteria')}</Typography>
                <MuiPasswordFormField
                    name="newPassword"
                    label={t('passwordReset.newPassword')}
                    autoComplete="new-password"
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
                />
                <MuiPasswordFormField
                    name="repeatPassword"
                    label={t('passwordReset.repeatPassword')}
                    autoComplete="new-password"
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
                />
                <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
                    sx={{ mt: 2, borderRadius: '100px', textTransform: 'none' }}
                >
                    {t('passwordReset.setPassword')}
                </Button>
            </Form>
        </div>
    );
};
