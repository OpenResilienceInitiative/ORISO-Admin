import type { StoryObj } from '@storybook/react-vite';
import { PHONE_390, LONG_DPA_HTML } from '../../components/DpaLegalForm/dpaStoryText';
import { createStubTenantAdminOnboardingClient } from '../../api/tenantOnboarding/tenantOnboarding';
import { PasswordResetPageLayout } from '../PasswordReset/PasswordResetPageLayout';
import { TenantAdminOnboarding } from './TenantAdminOnboarding';
import { DoneStep } from './DoneStep';

const longDpaClient = () =>
    createStubTenantAdminOnboardingClient({
        latencyMs: 0,
        invite: { dpaContent: JSON.stringify({ de: LONG_DPA_HTML, en: LONG_DPA_HTML }) },
    });

const page = () => (
    <PasswordResetPageLayout variant="longForm">
        <TenantAdminOnboarding inviteToken="storybook-invite-token" client={longDpaClient()} />
    </PasswordResetPageLayout>
);

const donePage = () => (
    <PasswordResetPageLayout variant="longForm">
        <DoneStep tenantId={21} />
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
