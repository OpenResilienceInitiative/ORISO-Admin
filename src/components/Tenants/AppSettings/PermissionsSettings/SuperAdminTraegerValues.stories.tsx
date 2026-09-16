import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath the eslint node resolver can't see (resolves for tsc/Vite)
import { expect, waitFor } from 'storybook/test';
import { UserRole } from '../../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../../utils/storybook/adminStoryDecorators';
import { SuperAdminPermissionsSettings } from './SuperAdminPermissionsSettings';

/**
 * ORISO-Admin#989 — platform view of one Träger (`/admin/tenants/<id>/global-settings`):
 * the permission and the Träger's real value are two separate statements.
 */

const GROUP = 'featureGroupChatV2Enabled';

// Every authenticated call must be mocked: an unmocked one 401s and force-logs-out the story.
const CONTROLS = '*/service/tenantadmin/controls';
const TENANT_BY_ID = '*/service/tenantadmin/:id';
const TENANT_PUBLIC = '*/service/tenant/public/*';
const TENANT_PUBLIC_BY_ID = '*/service/tenant/:id';
const HANDOVER_REASON_POLICIES = '*/service/users/case-handover/reason-policies';

const handlers = ({
    controls = { permissionsPageEnabled: true, allowedPermissionToggles: null },
    traegerSettings,
}: {
    controls?: Record<string, unknown>;
    traegerSettings: Record<string, unknown>;
}) => [
    http.get(CONTROLS, () => HttpResponse.json(controls)),
    http.put(CONTROLS, async ({ request }) => HttpResponse.json(await request.json())),
    http.get(TENANT_BY_ID, () => HttpResponse.json({ id: 7, name: 'Träger Süd', settings: traegerSettings })),
    http.get(TENANT_PUBLIC, () => HttpResponse.json({ id: 7, settings: {} })),
    http.get(TENANT_PUBLIC_BY_ID, () => HttpResponse.json({ id: 7, settings: {} })),
    http.get(HANDOVER_REASON_POLICIES, () => HttpResponse.json([])),
];

const meta = {
    title: 'Organisms/Permissions/PlatformViewOfTraeger',
    component: SuperAdminPermissionsSettings,
    parameters: { layout: 'fullscreen' },
    args: { tenantId: '7', excludeCardKeys: ['liveChat'], showTraegerValues: true },
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.TenantAdmin], 7);
            return withAdminProviders(Story);
        },
    ],
} satisfies Meta<typeof SuperAdminPermissionsSettings>;

export default meta;
type Story = StoryObj<typeof meta>;

const row = (root: HTMLElement, field: string) => root.querySelector(`[data-feature-policy="${field}"]`) as HTMLElement;

/** The Träger is allowed to use group chats but has them switched off — the page says so. */
export const GroupChatsAllowedButOff: Story = {
    parameters: { msw: { handlers: handlers({ traegerSettings: { [GROUP]: false } }) } },
    play: async ({ canvasElement }) => {
        await waitFor(() => expect(row(canvasElement, GROUP)).not.toBeNull(), { timeout: 5000 });
        await waitFor(() =>
            expect(row(canvasElement, GROUP).textContent).toContain('Erlaubt, aber bei diesem Träger ausgeschaltet'),
        );
    },
};

/** The Träger has group chats on: permission and real value agree. */
export const GroupChatsOn: Story = {
    parameters: { msw: { handlers: handlers({ traegerSettings: { [GROUP]: true } }) } },
    play: async ({ canvasElement }) => {
        await waitFor(() => expect(row(canvasElement, GROUP)).not.toBeNull(), { timeout: 5000 });
        await waitFor(() => expect(row(canvasElement, GROUP).textContent).toContain('Bei diesem Träger: an'));
    },
};

/** The platform preset itself has group chats off — the row follows the preset, not an all-on default. */
export const PlatformPresetGroupChatsOff: Story = {
    parameters: {
        msw: {
            handlers: handlers({
                controls: {
                    permissionsPageEnabled: true,
                    allowedPermissionToggles: null,
                    permissionPolicies: { [GROUP]: { value: false, mode: 'SUGGESTED' } },
                },
                traegerSettings: { [GROUP]: false },
            }),
        },
    },
    play: async ({ canvasElement }) => {
        await waitFor(() => expect(row(canvasElement, GROUP)).not.toBeNull(), { timeout: 5000 });
        await waitFor(() =>
            expect(row(canvasElement, GROUP).querySelector('[data-testid="BlockIcon"]')).not.toBeNull(),
        );
    },
};
