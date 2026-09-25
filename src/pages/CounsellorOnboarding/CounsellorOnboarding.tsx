import { useId, useMemo } from 'react';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Refresh from '@mui/icons-material/Refresh';
import { Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import routePathNames from '../../appConfig';
import {
    CounsellorOnboardingClient,
    CounsellorTopicOption,
    createHttpCounsellorOnboardingClient,
} from '../../api/counsellorOnboarding/counsellorOnboarding';
import { M3Button } from '../../components/M3Button';
import { FloatingLabelInput } from '../../components/FloatingLabelInput';
import { FloatingLabelSelect } from '../../components/FloatingLabelSelect';
import { InputChipPicker } from '../../components/InputChipPicker';
import { FilterChip } from '../../components/FilterChip';
import { M3Switch } from '../../components/M3Switch';
import { CounsellorAvatarField } from '../../components/CounsellorAvatarField';
import { TwoFactorSetup, TwoFactorSetupInlineError } from '../../components/TwoFactorSetup/TwoFactorSetup';
import { toBase32Secret } from '../../utils/totpSecret';
import { SALUTATION_KEYS } from '../../utils/salutationKeys';
import { SuccessCard } from '../../components/cards/SuccessCard';
import { passwordErrorKey, usernameErrorKey } from '../../utils/consultantCredentialRules';
import { LinkErrorState } from '../TenantOnboarding/LinkErrorState';
import {
    counsels,
    effectiveTopicPermission,
    isAgencyAdminInvite,
    MIN_PASSWORD_LENGTH,
    useCounsellorOnboardingFlow,
} from './useCounsellorOnboardingFlow';
import styles from './styles.module.scss';
import { ReactComponent as CounsellorGlyph } from '../../resources/img/svg/navbar/users_active.svg';

interface CounsellorOnboardingProps {
    inviteToken: string;
    /**
     * Backend seam — defaults to the real public UserService client
     * ({@link createHttpCounsellorOnboardingClient}); tests and Storybook
     * inject the stub here.
     */
    client?: CounsellorOnboardingClient;
}

const topicLabel = (topic: CounsellorTopicOption, fallbackPrefix: string) =>
    topic.name?.trim() ? topic.name : `${fallbackPrefix} ${topic.id}`;

/** Plain section heading + optional helper line, left-aligned, no icon. */
const Section = ({
    titleKey,
    hintKey,
    children,
}: {
    titleKey: string;
    hintKey?: string;
    children: React.ReactNode;
}) => {
    const { t } = useTranslation();
    return (
        <section className={styles.section} aria-labelledby={`${titleKey}-heading`}>
            <h2 id={`${titleKey}-heading`} className={styles.sectionTitle}>
                {t(titleKey)}
            </h2>
            {hintKey && <p className={styles.sectionHint}>{t(hintKey)}</p>}
            <div className={styles.fieldStack}>{children}</div>
        </section>
    );
};

/**
 * Public counsellor onboarding (#997): a counsellor invite link opens this
 * form instead of the generic app acceptance page. Since the owner review it
 * is ONE plain single-column form on every viewport — no cards, no
 * step-by-step flow: the field groups are separated by plain section
 * headings and there is exactly one submit at the end. Registration creates
 * the consultant through the SAME backend path as the normal admin form,
 * then the mandatory 2FA setup finishes the flow (resume contract identical
 * to the tenant-admin onboarding).
 */
export const CounsellorOnboarding = ({ inviteToken, client }: CounsellorOnboardingProps) => {
    const { t } = useTranslation();
    const alsoCounsellorId = useId();
    const navigate = useNavigate();
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
        updateAvatar,
        updateAgency,
        setTopics,
        toggleTopic,
        setAlsoCounsellor,
        submitRegistration,
        submitTwoFactorCode,
    } = useCounsellorOnboardingFlow(inviteToken, resolvedClient);

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
    // A reserved Beratungsstellen-ID (composer AUTO/free id): the agency does not
    // exist yet — the invitee names it and becomes its owner on registration.
    const createsAgency = invite.agencyExists === false;
    // Selectable = the invite's coverage (preselected) plus every active tenant
    // topic: the invitee drops preselected chips by their x and adds further
    // platform-defined topics via "+" (owner decision 2026-09-17).
    const hasCoverage = topics.length > 0;
    const selectableTopics = [...topics, ...(invite.availableTopics ?? [])].filter(
        (topic, index, all) => all.findIndex((other) => other.id === topic.id) === index,
    );
    const topicOptions = selectableTopics.map((topic) => ({
        value: topic.id,
        label: topicLabel(topic, topicFallback),
    }));
    // Without CREATE there is no "+": the invitee only picks among the agency's own topics.
    const topicPermission = effectiveTopicPermission(invite);
    const agencyTopicsOnly = topicPermission !== 'CREATE';
    const singleAgencyTopic = agencyTopicsOnly && topics.length === 1;
    const pickExactlyOne = topicPermission === 'NONE' && !singleAgencyTopic;
    let topicHintKey: string | undefined;
    if (selectableTopics.length === 0) {
        // No hint over an empty row — the alert below carries the explanation.
        topicHintKey = undefined;
    } else if (singleAgencyTopic) {
        topicHintKey = 'counsellorOnboarding.topics.fixedHint';
    } else if (pickExactlyOne) {
        topicHintKey = 'counsellorOnboarding.topics.pickOneHint';
    } else if (agencyTopicsOnly) {
        topicHintKey = 'counsellorOnboarding.topics.selectExistingHint';
    } else {
        topicHintKey = hasCoverage ? 'counsellorOnboarding.topics.addHint' : 'counsellorOnboarding.topics.chooseHint';
    }

    // Shared consultant credential policy — identical to the normal admin
    // consultant form (utils/consultantCredentialRules): the form must never
    // accept a credential that form would reject.
    const usernameErrKey = usernameErrorKey(data.account.username);
    const passwordErrKey = passwordErrorKey(data.account.password);
    // An agency admin who does not counsel needs no topic and no counsellor profile.
    const agencyAdmin = isAgencyAdminInvite(invite);
    const counselling = counsels(invite, data);
    const topicsValid = !counselling || data.topicIds.length > 0;
    // The hint names what is still missing; without counselling no topic is.
    let submitHintKey = createsAgency ? 'counsellorOnboarding.submitHintAgency' : 'counsellorOnboarding.submitHint';
    if (!counselling) {
        submitHintKey = createsAgency
            ? 'counsellorOnboarding.submitHintAgencyNoTopics'
            : 'counsellorOnboarding.submitHintNoTopics';
    }
    const agencyValid = !createsAgency || data.agency.name.trim().length > 0;
    const canSubmit = usernameErrKey === null && passwordErrKey === null && topicsValid && agencyValid && !busy;
    // Field-specific inline errors appear while the field HAS content but
    // violates the policy; empty required fields are carried by the submit
    // hint instead of shouting at an untouched form.
    const usernameInlineError = data.account.username.length > 0 && usernameErrKey ? t(usernameErrKey) : undefined;
    const passwordInlineError = data.account.password.length > 0 && passwordErrKey ? t(passwordErrKey) : undefined;

    return (
        <form
            className={styles.wizard}
            data-testid="counsellor-onboarding-form"
            noValidate
            onSubmit={(event) => {
                event.preventDefault();
                if (canSubmit) {
                    submitRegistration();
                }
            }}
        >
            <header className={styles.pageHeader}>
                {/* Tonal badge with the counsellor glyph (the "Konten" mark of the admin
                    navigation) — tells the invitee at a glance which kind of account this
                    page creates, before the heading is read. */}
                <span className={styles.roleBadge} aria-hidden="true">
                    <CounsellorGlyph width={32} height={32} />
                </span>
                <Typography variant="h4" component="h1" className={styles.pageTitle} sx={{ fontWeight: 700, mb: 1 }}>
                    {agencyAdmin ? t('counsellorOnboarding.agencyAdminTitle') : t('counsellorOnboarding.title')}
                </Typography>
                <Typography color="text.secondary" className={styles.pageIntro} sx={{ mb: 1 }}>
                    {agencyAdmin ? t('counsellorOnboarding.agencyAdminIntro') : t('counsellorOnboarding.intro')}
                </Typography>
            </header>

            {agencyAdmin && (
                <Section
                    titleKey="counsellorOnboarding.alsoCounsellor.title"
                    hintKey="counsellorOnboarding.alsoCounsellor.hint"
                >
                    <div className={styles.switchRow}>
                        {/* Clicking the text toggles the switch; the switch itself carries the accessible name. */}
                        <label htmlFor={alsoCounsellorId} className={styles.switchLabel} aria-hidden="true">
                            {t('counsellorOnboarding.alsoCounsellor.label')}
                        </label>
                        <M3Switch
                            id={alsoCounsellorId}
                            checked={data.alsoCounsellor}
                            disabled={busy}
                            label={t('counsellorOnboarding.alsoCounsellor.label')}
                            onChange={setAlsoCounsellor}
                        />
                    </div>
                </Section>
            )}

            <Section titleKey="cards.advisorAccount.title" hintKey="cards.advisorAccount.subtitle">
                <FloatingLabelInput
                    label={t('cards.advisorAccount.email')}
                    readOnly
                    disabled
                    value={invite.recipientEmail}
                    autoComplete="email"
                />
                <FloatingLabelInput
                    label={t('cards.advisorAccount.username')}
                    error={usernameInlineError !== undefined}
                    supportingText={usernameInlineError ?? t('cards.advisorAccount.usernameHint')}
                    value={data.account.username}
                    autoComplete="username"
                    onChange={(e) => updateAccount({ username: e.target.value })}
                />
                <FloatingLabelInput
                    label={t('cards.advisorAccount.password')}
                    component={Input.Password}
                    error={passwordInlineError !== undefined}
                    supportingText={passwordInlineError ?? t('cards.advisorAccount.passwordHint')}
                    value={data.account.password}
                    autoComplete="new-password"
                    onChange={(e) => updateAccount({ password: e.target.value })}
                />
            </Section>

            <Section titleKey="cards.personalInfo.title" hintKey="cards.personalInfo.subtitle">
                {/* Names come from the invite, read-only — corrections go through the admin. */}
                <FloatingLabelInput
                    label={t('cards.personalInfo.firstName')}
                    value={invite.firstName ?? ''}
                    readOnly
                    disabled
                />
                <FloatingLabelInput
                    label={t('cards.personalInfo.lastName')}
                    value={invite.lastName ?? ''}
                    readOnly
                    disabled
                />
                {counselling && (
                    <FloatingLabelSelect
                        label={t('cards.personalInfo.salutation')}
                        options={SALUTATION_KEYS.map((key) => ({
                            value: key,
                            label: t(`counselor.salutation.option.${key}`),
                        }))}
                        value={data.person.salutation}
                        onChange={(salutation) => updatePerson({ ...data.person, salutation })}
                        showSearch
                    />
                )}
                {counselling && (
                    <FloatingLabelInput
                        label={t('cards.personalInfo.position')}
                        value={data.person.position}
                        onChange={(e) => updatePerson({ ...data.person, position: e.target.value })}
                    />
                )}
                {counselling && (
                    <FloatingLabelInput
                        label={t('cards.personalInfo.jobTitle')}
                        allowClear
                        value={data.person.title}
                        onChange={(e) => updatePerson({ ...data.person, title: e.target.value })}
                    />
                )}
            </Section>

            {/*
              #1047: the avatar step is ON. Still one plain single-column section —
              the picker sits above the two names, exactly where the Figma card puts
              it. The own-picture upload is the only part still missing (#1049).
            */}
            {counselling && (
                <Section titleKey="cards.avatarName.title" hintKey="cards.avatarName.subtitle">
                    <CounsellorAvatarField
                        value={data.avatar}
                        onChange={updateAvatar}
                        displayName={data.names.publicName}
                        firstname={invite.firstName}
                        lastname={invite.lastName}
                    />
                    <FloatingLabelInput
                        label={t('cards.avatarName.publicName')}
                        supportingText={t('cards.avatarName.publicNameHint')}
                        value={data.names.publicName}
                        onChange={(e) => updateNames({ ...data.names, publicName: e.target.value })}
                    />
                    <FloatingLabelInput
                        label={t('cards.avatarName.internalName')}
                        supportingText={t('cards.avatarName.internalNameHint')}
                        value={data.names.internalName}
                        onChange={(e) => updateNames({ ...data.names, internalName: e.target.value })}
                    />
                </Section>
            )}

            {createsAgency && (
                <Section titleKey="counsellorOnboarding.agency.title" hintKey="counsellorOnboarding.agency.subtitle">
                    <FloatingLabelInput
                        label={t('counsellorOnboarding.agency.name')}
                        supportingText={t('counsellorOnboarding.agency.nameHint')}
                        value={data.agency.name}
                        maxLength={100}
                        autoComplete="organization"
                        onChange={(e) => updateAgency({ name: e.target.value })}
                    />
                </Section>
            )}

            {counselling && (
                <Section titleKey="cards.focusTopics.title" hintKey={topicHintKey}>
                    {/* eslint-disable-next-line no-nested-ternary -- three exclusive states, read top-down */}
                    {selectableTopics.length === 0 ? (
                        // Neither coverage nor tenant topics: say so instead of leaving a
                        // submit that can never be enabled.
                        <Typography
                            role="alert"
                            variant="body2"
                            color="text.secondary"
                            data-testid="wizard-topics-none"
                        >
                            {t('counsellorOnboarding.topics.none')}
                        </Typography>
                    ) : agencyTopicsOnly ? (
                        <div
                            className={styles.topicChipRow}
                            role="group"
                            aria-label={t('cards.focusTopics.title')}
                            data-testid="wizard-agency-topics"
                        >
                            {topics.map((topic) => {
                                const selected = data.topicIds.includes(topic.id);
                                return (
                                    <FilterChip
                                        key={topic.id}
                                        label={topicLabel(topic, topicFallback)}
                                        selected={selected}
                                        disabled={singleAgencyTopic || busy}
                                        onChange={(next) => {
                                            if (pickExactlyOne) {
                                                setTopics(next ? [topic.id] : []);
                                            } else {
                                                toggleTopic(topic.id);
                                            }
                                        }}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <InputChipPicker
                            options={topicOptions}
                            value={data.topicIds}
                            onChange={setTopics}
                            addLabel={t('counsellorOnboarding.topics.add')}
                            removeLabel={(label) => t('counsellorOnboarding.topics.remove', { topic: label })}
                            ariaLabel={t('cards.focusTopics.title')}
                        />
                    )}
                </Section>
            )}

            <div className={styles.submitRow}>
                {submitError === 'registration' && (
                    <Typography role="alert" color="error" data-testid="wizard-registration-error">
                        {t('counsellorOnboarding.registrationError')}
                    </Typography>
                )}
                {!canSubmit && !busy && (
                    <Typography color="text.secondary" variant="body2" data-testid="wizard-submit-hint">
                        {t(submitHintKey, { minLength: MIN_PASSWORD_LENGTH })}
                    </Typography>
                )}
                <M3Button type="submit" variant="filled" disabled={!canSubmit} loading={busy}>
                    {t('counsellorOnboarding.submit')}
                </M3Button>
            </div>
        </form>
    );
};
