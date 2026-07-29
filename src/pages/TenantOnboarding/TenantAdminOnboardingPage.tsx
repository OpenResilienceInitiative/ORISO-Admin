import { useParams } from 'react-router-dom';
import { PasswordResetPageLayout } from '../PasswordReset/PasswordResetPageLayout';
import { TenantAdminOnboarding } from './TenantAdminOnboarding';

/**
 * Public route `/admin/tenant-onboarding/:token` (#571). The token is the raw
 * invite token from the emailed accept link (`{acceptBaseUrl}/{rawToken}`,
 * cf. AccountInviteService.buildAcceptUrl in UserService).
 */
export const TenantAdminOnboardingPage = () => {
    const { token } = useParams<{ token: string }>();

    return (
        <PasswordResetPageLayout>
            <TenantAdminOnboarding inviteToken={token ? decodeURIComponent(token).trim() : ''} />
        </PasswordResetPageLayout>
    );
};
