import { OnboardingTwoFactorSetup, OnboardingTwoFactorSetupProps } from './OnboardingTwoFactorSetup';
import { ProfileTwoFactorSetup, ProfileTwoFactorSetupProps } from './ProfileTwoFactorSetup';

export type { TwoFactorAppLink } from './TwoFactorAppConnect';
export type { TwoFactorSetupInlineError } from './OnboardingTwoFactorSetup';

export type TwoFactorSetupProps =
    | ({ context: 'profile' } & ProfileTwoFactorSetupProps)
    | ({ context: 'onboarding' } & OnboardingTwoFactorSetupProps);

/**
 * Canonical 2FA setup component (release blocker #569 / TEN-INV U8, #571).
 *
 * ONE component, started from different contexts:
 *  - `context="profile"` — authenticated admin/consultant profile: activation
 *    switch + stepped overlay wizard, backed by the real user-service hooks
 *    (`useUserTwoFactorAuth` & friends). `required` drives the mandatory-setup
 *    behavior used by `MandatoryTwoFactorSetup`.
 *  - `context="onboarding"` — public tenant-admin onboarding (no session yet):
 *    inline app-TOTP linking + verification, data/submit injected through the
 *    onboarding backend seam (`TenantAdminOnboardingClient`).
 *
 * Both variants share the flow contract in `twoFactorSetupFlow.ts`, which is a
 * port of `ORISO-Frontend/src/components/twoFactorAuth/twoFactorSetupFlow.ts` —
 * step vocabulary, ordering and OTP rules are identical across the app and
 * admin layers.
 *
 * Shared-package extraction (future, do NOT do ad hoc): to publish this as a
 * real cross-repo package the following would have to move out first:
 *  1. `twoFactorSetupFlow.ts` + the constants — pure TS, extractable as-is.
 *  2. A headless state machine over the step contract (currently the profile
 *     variant drives steps through the Admin `Overlay` component, the Frontend
 *     through `TwoFactorSetupDialog`) — both UIs would consume it.
 *  3. A client interface (`activateApp(otp, secret)`, `sendEmailCode(email)`,
 *     `activateEmail(otp)`, `deactivate()`) with per-layer adapters; error
 *     taxonomy normalized to the Frontend's
 *     `invalidCode | precondition | roleDisabled | tooManyRequests` keys.
 *  4. Presentation stays per layer (Admin: antd/MUI M3, Frontend: legacy
 *     component kit) — only flow + client contracts are shared.
 */
export const TwoFactorSetup = (props: TwoFactorSetupProps) => {
    if (props.context === 'onboarding') {
        const { context, ...rest } = props;
        return <OnboardingTwoFactorSetup {...rest} />;
    }
    const { context, ...rest } = props;
    return <ProfileTwoFactorSetup {...rest} />;
};
