import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
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

const agency = (settings: AgencySettings) => ({
    _embedded: {
        id: '55',
        name: 'Beratungsstelle Nord',
        tenantId: 2,
        settings,
    },
});

const handlers = (settings: AgencySettings) => [
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
