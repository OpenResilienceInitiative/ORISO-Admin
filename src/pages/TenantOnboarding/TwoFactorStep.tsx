import { TwoFactorSetup, TwoFactorSetupInlineError } from '../../components/TwoFactorSetup/TwoFactorSetup';
import { toBase32Secret } from '../../utils/totpSecret';
import { TwoFactorStepData } from './useTenantAdminOnboardingFlow';

interface TwoFactorStepProps {
    result: TwoFactorStepData;
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
 *
 * Resume (#569): when a consumed-but-2FA-pending link re-enters here without
 * re-issued setup material, `appLink` is null and the canonical component
 * renders the verify-only variant.
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
            appLink={
                result.twoFactor
                    ? {
                          secretBase32: toBase32Secret(result.twoFactor.secret),
                          qrCodeBase64: result.twoFactor.qrCodeBase64,
                      }
                    : null
            }
            resumed={result.resumed}
            busy={busy}
            error={error}
            titleKey="tenantOnboarding.twoFactor.title"
            descriptionKey="tenantOnboarding.twoFactor.description"
            onVerify={onSubmit}
        />
    );
};
