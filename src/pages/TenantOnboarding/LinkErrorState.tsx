import Typography from '@mui/material/Typography';
import LoginRounded from '@mui/icons-material/LoginRounded';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import routePathNames from '../../appConfig';
import { InviteLinkErrorReason } from '../../api/tenantOnboarding/tenantOnboarding';
import { M3Button } from '../../components/M3Button';

const REASON_KEYS: Record<InviteLinkErrorReason, { title: string; description: string }> = {
    CONSUMED: {
        title: 'tenantOnboarding.linkError.consumed.title',
        description: 'tenantOnboarding.linkError.consumed.description',
    },
    REVOKED: {
        title: 'tenantOnboarding.linkError.revoked.title',
        description: 'tenantOnboarding.linkError.revoked.description',
    },
    EXPIRED: {
        title: 'tenantOnboarding.linkError.expired.title',
        description: 'tenantOnboarding.linkError.expired.description',
    },
    // Unlike the other deaths this one has a live remedy: the resend that
    // superseded this link also delivered its replacement — say so.
    SUPERSEDED: {
        title: 'tenantOnboarding.linkError.superseded.title',
        description: 'tenantOnboarding.linkError.superseded.description',
    },
    INVALID: {
        title: 'tenantOnboarding.linkError.invalid.title',
        description: 'tenantOnboarding.linkError.invalid.description',
    },
};

/**
 * Terminal state for consumed/revoked/expired/unknown invite links (#571).
 * Deliberately renders NO form and no retry action — a dead link cannot be
 * resubmitted. A consumed link belongs to an account that already exists, so
 * its only action is the way to the login (#1065); every other death needs a
 * fresh invite instead.
 */
export const LinkErrorState = ({ reason }: { reason: InviteLinkErrorReason }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const keys = REASON_KEYS[reason];

    if (reason === 'CONSUMED') {
        return (
            <div data-testid="link-error-consumed">
                <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 3 }}>
                    {t(keys.title)}
                </Typography>
                <Typography role="alert" sx={{ mb: 2 }}>
                    {t(keys.description)}
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                    {t('tenantOnboarding.linkError.consumed.loginHint')}
                </Typography>
                <M3Button
                    variant="filled"
                    icon={<LoginRounded fontSize="small" />}
                    onClick={() => navigate(routePathNames.login)}
                >
                    {t('tenantOnboarding.linkError.consumed.toLogin')}
                </M3Button>
            </div>
        );
    }

    return (
        <div data-testid={`link-error-${reason.toLowerCase()}`}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 3 }}>
                {t(keys.title)}
            </Typography>
            <Typography role="alert" sx={{ mb: 2 }}>
                {t(keys.description)}
            </Typography>
            <Typography color="text.secondary">{t('tenantOnboarding.linkError.contactHint')}</Typography>
        </div>
    );
};
