import type { StoryObj } from '@storybook/react-vite';
import { PHONE_390, LONG_DPA_HTML } from '../../components/DpaLegalForm/dpaStoryText';
import { createStubTenantAdminOnboardingClient } from '../../api/tenantOnboarding/tenantOnboarding';
import { PasswordResetPageLayout } from '../PasswordReset/PasswordResetPageLayout';
import { TenantAdminOnboarding } from './TenantAdminOnboarding';
import { DoneStep } from './DoneStep';
import { OnboardingSheet } from './OnboardingSheet';

/**
 * A short, real-shaped AVV (mirrors the pre-dev content that exposed the
 * broken chapter navigation, owner report 2026-08-18 F4/H4): few chapters,
 * not enough text to fill the viewport on its own. This is the shape that
 * broke the scroll spy — a document long enough to matter but short enough
 * that "how far the page scrolled" and "how far into the document a heading
 * sits" are easy to conflate, which is exactly the bug (see
 * `useHeadingAnchorNav.ts`).
 */
const SHORT_DPA_HTML = `<h1 id="rechtsdokumente">Rechtsdokumente</h1><p>dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua.</p><p>Betriebsgrundsätze (AGB Träger - DCV) &#61; Zivilrechte Nutzungsvereinbarung</p><p>At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.</p><h2 id="anlage-1-avv">Anlage 1: AVV</h2><p>At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.</p><h2 id="anlage-2-beratungsgrundsatze-agb-ratsuchenden-tr">Anlage 2: Beratungsgrundsätze (AGB Ratsuchenden - Träger)</h2><p>At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.</p><h3 id="anlage-3-leistungsumfang-und-verfugbarkeit">Anlage 3: Leistungsumfang und Verfügbarkeit</h3><p>At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.</p><p></p><p>testing</p>`;

const shortDpaClient = () =>
    createStubTenantAdminOnboardingClient({
        latencyMs: 600,
        invite: { dpaContent: JSON.stringify({ de: SHORT_DPA_HTML, en: SHORT_DPA_HTML }) },
    });

const shortDpaPage = () => (
    <PasswordResetPageLayout variant="longForm">
        <TenantAdminOnboarding inviteToken="storybook-invite-token" client={shortDpaClient()} />
    </PasswordResetPageLayout>
);

const longDpaClient = () =>
    createStubTenantAdminOnboardingClient({
        latencyMs: 600,
        invite: { dpaContent: JSON.stringify({ de: LONG_DPA_HTML, en: LONG_DPA_HTML }) },
    });

const page = () => (
    <PasswordResetPageLayout variant="longForm">
        <TenantAdminOnboarding inviteToken="storybook-invite-token" client={longDpaClient()} />
    </PasswordResetPageLayout>
);

const donePage = () => (
    <PasswordResetPageLayout variant="longForm">
        {/* Same wrapper the real flow renders it in, so the story shows the
            actual surface (#594.8) and not a bare fragment. */}
        <OnboardingSheet>
            <DoneStep tenantId={21} />
        </OnboardingSheet>
    </PasswordResetPageLayout>
);

/**
 * The public onboarding page as the invitee sees it (#594.3): the Admin
 * branding fade plays once, then the flow is presented CENTRED in the wide
 * reading column on desktop. Below xl the stage settles off-canvas and the page
 * keeps its own scroll container, so the form stays reachable at 390x844.
 */
const meta = {
    title: 'Pages/TenantOnboarding/PublicPage',
    parameters: { layout: 'fullscreen' },
    render: page,
};

export default meta;

/**
 * Desktop: centred in the viewport, wide enough to actually read a contract —
 * and clear of the fixed language selector in the top-right corner, which the
 * 640px reading measure used to run into between 1200 and 1920 (#594.2 review).
 */
export const Desktop: StoryObj = {};

/** 390x844: top-aligned and scrollable — the primary action stays reachable. */
export const Mobile: StoryObj = {
    parameters: { layout: 'fullscreen', ...PHONE_390.parameters },
    globals: PHONE_390.globals,
};

/** #594.7 — the success screen on the real page: centred, not pinned top-left. */
export const Done: StoryObj = { render: donePage };

/** The same success screen at 390x844. */
export const DoneMobile: StoryObj = {
    render: donePage,
    parameters: { layout: 'fullscreen', ...PHONE_390.parameters },
    globals: PHONE_390.globals,
};

/**
 * The short AVV shape that exposed the broken chapter navigation on pre-dev
 * (owner report 2026-08-18, F4/H4): click a chip, or load with `#anlage-1-avv`
 * in the URL — both must scroll and keep the active chip in sync in this
 * FLUID embedding, the same way they already do in the editor's own
 * fixed-height card.
 */
export const ShortDpaDocument: StoryObj = { render: shortDpaPage };
