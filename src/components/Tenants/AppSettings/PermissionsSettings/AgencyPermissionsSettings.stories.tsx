import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export is not resolved by ESLint 7.
import { expect, within } from 'storybook/test';
import { UserRole } from '../../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../../utils/storybook/adminStoryDecorators';
import type { AgencySettings } from '../../../../types/agency';
import { AgencyPermissionsSettings } from './AgencyPermissionsSettings';

// All authenticated (`skipAuth: false`) calls must be mocked: an unmocked one reaches the
// real backend, 401s, and fetchData force-logs-out — which navigates the story away.
const AGENCY_BY_ID = '*/service/agencyadmin/agencies/:id';
const TENANT_PUBLIC = '*/service/tenant/public/*';
const TENANT_BY_ID = '*/service/tenant/:id';
const HANDOVER_REASON_POLICIES = '*/service/users/case-handover/reason-policies';
const TRAEGER_POLICIES = '*/service/tenantadmin/:id/permission-policies';

const agency = (settings: AgencySettings) => ({
    _embedded: {
        id: '55',
        name: 'Beratungsstelle Nord',
        tenantId: 2,
        settings,
    },
});

const handlers = (
    settings: AgencySettings,
    traegerPolicies = () => HttpResponse.json({ tenantId: 2, policies: {} }),
) => [
    http.get(TRAEGER_POLICIES, traegerPolicies),
    http.get(AGENCY_BY_ID, () => HttpResponse.json(agency(settings))),
    http.put(AGENCY_BY_ID, () => HttpResponse.json(agency(settings))),
    http.get(TENANT_PUBLIC, () => HttpResponse.json({ id: 2, settings: {} })),
    http.get(TENANT_BY_ID, () => HttpResponse.json({ id: 2, settings: {} })),
    http.get(HANDOVER_REASON_POLICIES, () => HttpResponse.json([])),
];

const meta = {
    title: 'Organisms/Permissions/AgencyPermissionsSettings',
    component: AgencyPermissionsSettings,
    parameters: { layout: 'fullscreen' },
    args: { agencyId: '55' },
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.AgencyAdmin], 2);
            return withAdminProviders(Story);
        },
    ],
} satisfies Meta<typeof AgencyPermissionsSettings>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Agency admin view: the agency's own toggles, everything on and editable. */
export const AgencyView: Story = {
    parameters: { msw: { handlers: handlers({}) } },
};

/** The agency has switched its live chat off: the card master is off and its
 *  sub-toggles are locked off while it stays off — "disable, don't hide". */
export const LiveChatMasterOff: Story = {
    parameters: {
        msw: { handlers: handlers({ featureAnonymousChatEnabled: false }) },
    },
};

/** The platform has forced video calls off for all agencies: every video
 *  sub-toggle is disabled-off and the agency admin cannot re-enable it. */
export const PlatformForcedVideoOff: Story = {
    parameters: {
        msw: {
            handlers: handlers({
                agencyAdminControls: { allowedPermissionToggles: { videoCalls: false } },
            }),
        },
    },
};

/** The platform has enforced voice messages on: the toggles show on-and-disabled
 *  even though the agency had stored them as off — lower roles cannot hide the feature. */
export const PlatformEnforcedVoiceMessagesOn: Story = {
    parameters: {
        msw: {
            handlers: handlers({
                featureVoiceMessagesEnabled: false,
                featureVoiceMessagesOneOnOneChatsEnabled: false,
                agencyAdminControls: { enforcedPermissionToggles: { voiceMessages: true } },
            }),
        },
    },
};

/** The Träger's channel switches cannot be read (403 for a centre-only admin): the tiles say so
 *  instead of showing defaults as the Träger's values. */
export const TraegerPoliciesFailed: Story = {
    parameters: {
        msw: { handlers: handlers({}, () => new HttpResponse(null, { status: 403 })) },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(
            (
                await canvas.findAllByText(/Träger.*(nicht geladen|could not be loaded)/i)
            ).length,
        ).toBeGreaterThan(0);
        await expect(
            canvasElement.querySelector('[data-feature-policy="featureAskerEmailLiveChatEnabled"]'),
        ).toBeNull();
    },
};
