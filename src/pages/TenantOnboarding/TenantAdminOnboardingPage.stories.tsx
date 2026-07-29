import type { StoryObj } from '@storybook/react-vite';
import { PHONE_390, LONG_DPA_HTML } from '../../components/DpaLegalForm/dpaStoryText';
import { createStubTenantAdminOnboardingClient } from '../../api/tenantOnboarding/tenantOnboarding';
import { PasswordResetPageLayout } from '../PasswordReset/PasswordResetPageLayout';
import { TenantAdminOnboarding } from './TenantAdminOnboarding';

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

/** Desktop: centred in the viewport, wide enough to actually read a contract. */
export const Desktop: StoryObj = {};

/** 390x844: top-aligned and scrollable — the primary action stays reachable. */
export const Mobile: StoryObj = {
    parameters: { layout: 'fullscreen', ...PHONE_390.parameters },
    globals: PHONE_390.globals,
};
