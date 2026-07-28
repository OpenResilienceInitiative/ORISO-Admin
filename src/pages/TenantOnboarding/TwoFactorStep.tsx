import { TenantAdminRegistrationResultDTO } from '../../api/tenantOnboarding/tenantOnboarding';
import { TwoFactorSetup, TwoFactorSetupInlineError } from '../../components/TwoFactorSetup/TwoFactorSetup';

interface TwoFactorStepProps {
    result: TenantAdminRegistrationResultDTO;
    busy: boolean;
    /** The submitted one-time password was rejected (retryable). */
    showCodeError: boolean;
    /** The activation failed technically (retryable). */
    showServiceError: boolean;
    onSubmit: (otp: string) => void;
}

/**
 * Step 3 (#571): mandatory 2FA setup for the freshly registered tenant admin.
 * Thin adapter around the canonical {@link TwoFactorSetup} (onboarding
 * context): maps the registration result from the public onboarding seam to
 * the shared app-link shape — there is no authenticated session yet, so the
 * canonical component runs on injected data instead of the user hooks.
 */
export const TwoFactorStep = ({ result, busy, showCodeError, showServiceError, onSubmit }: TwoFactorStepProps) => {
    let error: TwoFactorSetupInlineError = null;
    if (showCodeError) {
        error = 'invalid-code';
    } else if (showServiceError) {
        error = 'service';
    }

    return (
        <TwoFactorSetup
            context="onboarding"
            appLink={{
                secretBase32: result.twoFactor.secret,
                qrCodeBase64: result.twoFactor.qrCodeBase64,
            }}
            busy={busy}
            error={error}
            titleKey="tenantOnboarding.twoFactor.title"
            descriptionKey="tenantOnboarding.twoFactor.description"
            onVerify={onSubmit}
        />
    );
};
