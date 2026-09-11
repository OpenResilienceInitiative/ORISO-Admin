import { useParams } from 'react-router-dom';
import { PasswordResetPageLayout } from '../PasswordReset/PasswordResetPageLayout';
import { CounsellorOnboarding } from './CounsellorOnboarding';

/**
 * Public route `/admin/counsellor-onboarding/:token` (#997). The token is the
 * raw invite token from the emailed accept link (`{acceptBaseUrl}/{rawToken}`,
 * cf. InviteAcceptUrlBuilder in UserService).
 *
 * NOTE (#569 hardening, inherited from the tenant page): react-router already
 * URL-decodes path params — no second `decodeURIComponent`, which would
 * double-decode valid tokens and crash on stray `%`. A garbled token is passed
 * through and answered as an invalid link.
 */
export const CounsellorOnboardingPage = () => {
    const { token } = useParams<{ token: string }>();

    return (
        // `wizard`: the widest public column — the desktop composition places
        // the four wizard cards side by side (CardGrid), which the narrow
        // longForm reading column cannot host.
        <PasswordResetPageLayout variant="wizard">
            <CounsellorOnboarding inviteToken={token?.trim() ?? ''} />
        </PasswordResetPageLayout>
    );
};
