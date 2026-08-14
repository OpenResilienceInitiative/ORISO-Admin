import { useEffect, useMemo, useRef, useState } from 'react';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Refresh from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import routePathNames from '../../appConfig';
import {
    CounsellorOnboardingClient,
    CounsellorTopicOption,
    createHttpCounsellorOnboardingClient,
} from '../../api/counsellorOnboarding/counsellorOnboarding';
import { M3Button } from '../../components/M3Button';
import { TwoFactorSetup, TwoFactorSetupInlineError } from '../../components/TwoFactorSetup/TwoFactorSetup';
import { toBase32Secret } from '../../utils/totpSecret';
import { AdvisorAccountCard } from '../../components/cards/AdvisorAccountCard';
import { PersonalInfoCard } from '../../components/cards/PersonalInfoCard';
import { AvatarNameCard } from '../../components/cards/AvatarNameCard';
import { FocusTopicsCard } from '../../components/cards/FocusTopicsCard';
import { SuccessCard } from '../../components/cards/SuccessCard';
import { CardGrid } from '../../components/CardGrid';
import { useIsDesktopLayout } from '../../hooks/useIsDesktopLayout.hook';
import { passwordErrorKey, usernameErrorKey } from '../../utils/consultantCredentialRules';
import { LinkErrorState } from '../TenantOnboarding/LinkErrorState';
import { MIN_PASSWORD_LENGTH, useCounsellorOnboardingFlow } from './useCounsellorOnboardingFlow';
import styles from './styles.module.scss';

interface CounsellorOnboardingProps {
    inviteToken: string;
    /**
     * Backend seam — defaults to the real public UserService client
     * ({@link createHttpCounsellorOnboardingClient}); tests and Storybook
     * inject the stub here.
     */
    client?: CounsellorOnboardingClient;
}

/** Mobile step order: one card per step (#997); desktop composes them side by side. */
const MOBILE_STEPS = ['account', 'person', 'name', 'topics'] as const;
type MobileStep = (typeof MOBILE_STEPS)[number];

const topicLabel = (topic: CounsellorTopicOption, fallbackPrefix: string) =>
    topic.name?.trim() ? topic.name : `${fallbackPrefix} ${topic.id}`;

/**
 * Public counsellor onboarding wizard (#997): a counsellor invite link opens
 * this step-by-step flow assembled from the Counsellor Setup Wizard cards
 * (Storybook, unwired since PR #413). Desktop shows the form cards side by
 * side in a CardGrid (fewer clicks — one submit); below the desktop
 * breakpoint the classic one-card-per-step flow runs. Registration creates
 * the consultant through the SAME backend path as the normal admin form, then
 * the mandatory 2FA setup finishes the flow (resume contract identical to the
 * tenant-admin onboarding).
 */
export const CounsellorOnboarding = ({ inviteToken, client }: CounsellorOnboardingProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isDesktop = useIsDesktopLayout();
    const resolvedClient = useMemo(() => client ?? createHttpCounsellorOnboardingClient(), [client]);
    const {
        state,
        invite,
        data,
        submitError,
        busy,
        retryLoad,
        updateAccount,
        updatePerson,
        updateNames,
        toggleTopic,
        submitRegistration,
        submitTwoFactorCode,
    } = useCounsellorOnboardingFlow(inviteToken, resolvedClient);
    const [mobileStep, setMobileStep] = useState<MobileStep>('account');
    // A step transition unmounts the button that carried the focus. Move the
    // focus onto the freshly rendered step region (tabIndex -1) so keyboard
    // and screen-reader users keep a meaningful position and announcement —
    // in BOTH directions (accessibility review on #997).
    const stepRegionRef = useRef<HTMLDivElement>(null);
    const stepRenderedOnceRef = useRef(false);
    useEffect(() => {
        if (!stepRenderedOnceRef.current) {
            stepRenderedOnceRef.current = true;
            return;
        }
        stepRegionRef.current?.focus();
    }, [mobileStep]);

    if (state.phase === 'loading') {
        return (
            <div className={styles.wizard}>
                <div className={styles.loading} role="status" aria-label={t('counsellorOnboarding.loading')}>
                    <CircularProgress />
                </div>
            </div>
        );
    }

    if (state.phase === 'load-error') {
        // Transient resolve failure: NOT a dead link — offer a retry instead
        // of the terminal error states (#569 hardening, same as tenant flow).
        return (
            <div className={styles.wizard} data-testid="onboarding-load-error">
                <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 3 }}>
                    {t('counsellorOnboarding.loadError.title')}
                </Typography>
                <Typography role="alert" sx={{ mb: 3 }}>
                    {t('counsellorOnboarding.loadError.description')}
                </Typography>
                <M3Button variant="filled" icon={<Refresh fontSize="small" />} onClick={retryLoad}>
                    {t('counsellorOnboarding.loadError.retry')}
                </M3Button>
            </div>
        );
    }

    if (state.phase === 'link-error') {
        return (
            <div className={styles.wizard}>
                <LinkErrorState reason={state.reason} />
            </div>
        );
    }

    if (state.phase === 'done') {
        return (
            <div className={styles.wizard} data-testid="onboarding-done">
                <SuccessCard onFinish={() => navigate(routePathNames.login)} />
            </div>
        );
    }

    if (state.phase === 'two-factor') {
        let error: TwoFactorSetupInlineError = null;
        if (submitError === 'two-factor-code') {
            error = 'invalid-code';
        } else if (submitError === 'two-factor') {
            error = 'service';
        }
        return (
            <div className={styles.wizard}>
                <TwoFactorSetup
                    context="onboarding"
                    appLink={
                        state.result.twoFactor
                            ? {
                                  secretBase32: toBase32Secret(state.result.twoFactor.secret),
                                  qrCodeBase64: state.result.twoFactor.qrCodeBase64,
                              }
                            : null
                    }
                    resumed={state.result.resumed}
                    busy={busy}
                    error={error}
                    titleKey="counsellorOnboarding.twoFactor.title"
                    descriptionKey="counsellorOnboarding.twoFactor.description"
                    onVerify={submitTwoFactorCode}
                />
            </div>
        );
    }

    if (!invite) {
        return null;
    }

    const { topics } = invite;
    const topicFallback = t('counsellorOnboarding.topics.fallbackLabel');
    const labelsById = new Map(topics.map((topic) => [topic.id, topicLabel(topic, topicFallback)]));
    const idsByLabel = new Map(topics.map((topic) => [topicLabel(topic, topicFallback), topic.id]));
    const selectedLabels = data.topicIds
        .map((id) => labelsById.get(id))
        .filter((label): label is string => label !== undefined);

    // Shared consultant credential policy — identical to the normal admin
    // consultant form (utils/consultantCredentialRules): the wizard must never
    // accept a credential that form would reject.
    const usernameErrKey = usernameErrorKey(data.account.username);
    const passwordErrKey = passwordErrorKey(data.account.password);
    const topicsValid = data.topicIds.length > 0;
    const canSubmit = usernameErrKey === null && passwordErrKey === null && topicsValid && !busy;
    // Field-specific inline errors appear while the field HAS content but
    // violates the policy; empty required fields are carried by the submit
    // hint instead of shouting at an untouched form.
    const usernameInlineError = data.account.username.length > 0 && usernameErrKey ? t(usernameErrKey) : undefined;
    const passwordInlineError = data.account.password.length > 0 && passwordErrKey ? t(passwordErrKey) : undefined;

    const accountCard = (mobile: boolean) => (
        <AdvisorAccountCard
            value={{ email: invite.recipientEmail, ...data.account }}
            emailReadOnly
            usernameError={usernameInlineError}
            passwordError={passwordInlineError}
            onChange={(patch) => updateAccount(patch)}
            onNext={mobile ? () => setMobileStep('person') : undefined}
        />
    );
    const personCard = (mobile: boolean) => (
        <PersonalInfoCard
            value={{
                firstName: invite.firstName ?? '',
                lastName: invite.lastName ?? '',
                remarks: '',
                ...data.person,
                position: data.person.position,
                title: data.person.title,
                salutation: data.person.salutation,
            }}
            namesReadOnly
            hideRemarks
            onChange={(patch) =>
                updatePerson({
                    salutation: patch.salutation ?? data.person.salutation,
                    position: patch.position ?? data.person.position,
                    title: patch.title ?? data.person.title,
                })
            }
            onBack={mobile ? () => setMobileStep('account') : undefined}
            onNext={mobile ? () => setMobileStep('name') : undefined}
        />
    );
    const nameCard = (mobile: boolean) => (
        <AvatarNameCard
            avatars={[]}
            // Reduced variant (#997): names only — the avatar grid and picture
            // upload return with #995 and slot back into this card.
            showAvatarSection={false}
            showPictureSection={false}
            value={{ ...data.names, ownPictureInternalOnly: false }}
            onChange={(patch) =>
                updateNames({
                    publicName: patch.publicName ?? data.names.publicName,
                    internalName: patch.internalName ?? data.names.internalName,
                })
            }
            onBack={mobile ? () => setMobileStep('person') : undefined}
            onNext={mobile ? () => setMobileStep('topics') : undefined}
        />
    );
    const topicsCard = (mobile: boolean) => (
        <FocusTopicsCard
            topics={[...idsByLabel.keys()]}
            selected={selectedLabels}
            onToggle={(label) => {
                const id = idsByLabel.get(label);
                if (id !== undefined) {
                    toggleTopic(id);
                }
            }}
            onBack={mobile ? () => setMobileStep('name') : undefined}
            onNext={
                mobile
                    ? () => {
                          // Same validation gate as the desktop submit — an
                          // invalid form keeps the hint on screen instead of
                          // bouncing off the backend.
                          if (canSubmit) {
                              submitRegistration();
                          }
                      }
                    : undefined
            }
        />
    );

    const submitHint = !canSubmit && !busy && (
        <Typography color="text.secondary" variant="body2" data-testid="wizard-submit-hint">
            {t('counsellorOnboarding.submitHint', { minLength: MIN_PASSWORD_LENGTH })}
        </Typography>
    );

    const registrationError = submitError === 'registration' && (
        <Typography role="alert" color="error" data-testid="wizard-registration-error">
            {t('counsellorOnboarding.registrationError')}
        </Typography>
    );

    return (
        <div className={styles.wizard} data-testid="counsellor-onboarding-form">
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
                {t('counsellorOnboarding.title')}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
                {isDesktop
                    ? t('counsellorOnboarding.intro')
                    : t('counsellorOnboarding.stepIndicator', {
                          current: MOBILE_STEPS.indexOf(mobileStep) + 1,
                          total: MOBILE_STEPS.length,
                      })}
            </Typography>
            {isDesktop ? (
                <>
                    <CardGrid minCardWidth={360} maxColumns={2} className={styles.grid}>
                        {accountCard(false)}
                        {personCard(false)}
                        {nameCard(false)}
                        {topicsCard(false)}
                    </CardGrid>
                    <div className={styles.submitRow}>
                        {registrationError}
                        {submitHint}
                        <M3Button
                            variant="filled"
                            disabled={!canSubmit}
                            loading={busy}
                            onClick={() => submitRegistration()}
                        >
                            {t('counsellorOnboarding.submit')}
                        </M3Button>
                    </div>
                </>
            ) : (
                <div
                    ref={stepRegionRef}
                    tabIndex={-1}
                    role="group"
                    aria-label={t('counsellorOnboarding.stepIndicator', {
                        current: MOBILE_STEPS.indexOf(mobileStep) + 1,
                        total: MOBILE_STEPS.length,
                    })}
                    className={styles.mobileStep}
                >
                    {mobileStep === 'account' && accountCard(true)}
                    {mobileStep === 'person' && personCard(true)}
                    {mobileStep === 'name' && nameCard(true)}
                    {mobileStep === 'topics' && (
                        <>
                            {topicsCard(true)}
                            {registrationError}
                            {submitHint}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
