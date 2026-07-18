import { useState } from 'react';
import { Form } from 'antd';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MuiFormField } from '../../components/mui/MuiFormField';
import { requestAdminPasswordReset } from '../../api/passwordReset/passwordReset';
import routePathNames from '../../appConfig';

export const PasswordResetRequestForm = () => {
    const { t, i18n } = useTranslation();
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);

    const onFinish = async ({ username }: { username: string }) => {
        setLoading(true);
        setFailed(false);
        try {
            const locale = (i18n.resolvedLanguage || i18n.language || 'de').split('-')[0];
            await requestAdminPasswordReset(username.trim(), locale);
            setSubmitted(true);
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="loginForm">
                <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 3 }}>
                    {t('passwordReset.sentTitle')}
                </Typography>
                <Typography sx={{ mb: 4 }}>{t('passwordReset.sentDescription')}</Typography>
                <Link to={routePathNames.login} className="forgotPW">
                    {t('passwordReset.backToLogin')}
                </Link>
            </div>
        );
    }

    return (
        <div className="loginForm">
            <Form className="passwordResetForm" onFinish={onFinish} layout="vertical" requiredMark={false}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
                    {t('passwordReset.requestTitle')}
                </Typography>
                <Typography sx={{ mb: 3 }}>{t('passwordReset.requestDescription')}</Typography>
                <MuiFormField
                    name="username"
                    label={t('passwordReset.identityLabel')}
                    autoComplete="username"
                    rules={[{ required: true, message: t('passwordReset.identityRequired') }]}
                />
                {failed && (
                    <Typography role="alert" color="error" sx={{ mb: 2 }}>
                        {t('passwordReset.requestError')}
                    </Typography>
                )}
                <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
                    sx={{ mt: 2, borderRadius: '100px', textTransform: 'none' }}
                >
                    {t('passwordReset.submit')}
                </Button>
                <Link to={routePathNames.login} className="forgotPW">
                    {t('passwordReset.backToLogin')}
                </Link>
            </Form>
        </div>
    );
};
