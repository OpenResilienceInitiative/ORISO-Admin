import { useParams } from 'react-router-dom';
import { PasswordResetPageLayout } from '../PasswordReset/PasswordResetPageLayout';
import { TenantAdminOnboarding } from './TenantAdminOnboarding';

/**
 * Public route `/admin/tenant-onboarding/:token` (#571). The token is the raw
 * invite token from the emailed accept link (`{acceptBaseUrl}/{rawToken}`,
 * cf. AccountInviteService.buildAcceptUrl in UserService).
 *
 * NOTE (#569 hardening): react-router already URL-decodes path params, so no
 * second `decodeURIComponent` here — it double-decoded valid tokens and threw
 * a render-crashing `URIError` on mangled links containing a stray `%`. A
 * garbled token is simply passed through and answered as an invalid link.
 */
export const TenantAdminOnboardingPage = () => {
    const { token } = useParams<{ token: string }>();

    return (
        <PasswordResetPageLayout>
            <TenantAdminOnboarding inviteToken={token?.trim() ?? ''} />
        </PasswordResetPageLayout>
    );
};
