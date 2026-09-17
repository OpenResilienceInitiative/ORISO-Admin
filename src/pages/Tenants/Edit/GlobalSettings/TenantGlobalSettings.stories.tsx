import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { Navigate, Route, Routes } from 'react-router-dom';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath the eslint node resolver can't see (resolves for tsc/Vite)
import { expect, waitFor } from 'storybook/test';
import { UserRole } from '../../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../../utils/storybook/adminStoryDecorators';
import { TenantGlobalSettings } from './index';

/**
 * ORISO-Admin#989 — `/admin/tenants/<id>/global-settings`: the platform admin edits THIS Träger's
 * feature values and policies. The page shows what the Träger actually has switched on.
 */

// ORISO-Admin#988: the conversation-circle card is its own master, not the legacy
// featureGroupChatV2Enabled family switch (that one lives under Other functions).
const GROUP = 'featureSelfHelpGroupsEnabled';

// Every authenticated call must be mocked: an unmocked one 401s and force-logs-out the story.
const TENANT_BY_ID = '*/service/tenantadmin/:id';
const TENANT_POLICIES = '*/service/tenantadmin/:id/permission-policies';
const TENANT_PUBLIC = '*/service/tenant/public/*';
const TENANT_PUBLIC_BY_ID = '*/service/tenant/:id';
const HANDOVER_REASON_POLICIES = '*/service/users/case-handover/reason-policies';

type Policy = { value: boolean; mode: 'ENFORCED' | 'SUGGESTED'; inherited?: boolean };

const handlers = (traegerSettings: Record<string, unknown>, policies: Record<string, Policy>) => [
    http.get(TENANT_POLICIES, () => HttpResponse.json({ tenantId: 7, policies })),
    http.put(TENANT_POLICIES, async ({ request }) => HttpResponse.json(await request.json())),
    http.get(TENANT_BY_ID, () => HttpResponse.json({ id: 7, name: 'Träger Süd', settings: traegerSettings })),
    http.get(TENANT_PUBLIC, () => HttpResponse.json({ id: 7, settings: {} })),
    http.get(TENANT_PUBLIC_BY_ID, () => HttpResponse.json({ id: 7, settings: {} })),
    http.get(HANDOVER_REASON_POLICIES, () => HttpResponse.json([])),
];

const meta = {
    title: 'Pages/Tenants/TenantGlobalSettings',
    component: TenantGlobalSettings,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.TenantAdmin], 0);
            // The preview already provides a MemoryRouter at "/"; the page reads `:id` from the
            // route, so navigate to the Träger route inside that router instead of nesting one.
            return withAdminProviders(() => (
                <Routes>
                    <Route path="/" element={<Navigate to="/admin/tenants/7/global-settings" replace />} />
                    <Route path="/admin/tenants/:id/global-settings" element={<Story />} />
                </Routes>
            ));
        },
    ],
} satisfies Meta<typeof TenantGlobalSettings>;

export default meta;
type Story = StoryObj<typeof meta>;

const row = (root: HTMLElement, field: string) => root.querySelector(`[data-feature-policy="${field}"]`) as HTMLElement;

/** The Träger has group chats switched off: the page says off, not "enabled". */
export const TraegerGroupChatsOff: Story = {
    parameters: {
        msw: { handlers: handlers({ [GROUP]: false }, { [GROUP]: { value: false, mode: 'SUGGESTED' } }) },
    },
    play: async ({ canvasElement }) => {
        await waitFor(() => expect(row(canvasElement, GROUP)).not.toBeNull(), { timeout: 5000 });
        await expect(row(canvasElement, GROUP).querySelector('[data-testid="BlockIcon"]')).not.toBeNull();
    },
};

/** The platform enforced group chats off for this Träger: the row is read-only for the Träger admin. */
export const PlatformEnforcedGroupChatsOff: Story = {
    parameters: {
        msw: {
            handlers: handlers({ [GROUP]: false }, { [GROUP]: { value: false, mode: 'ENFORCED', inherited: true } }),
        },
    },
    play: async ({ canvasElement }) => {
        await waitFor(() => expect(row(canvasElement, GROUP)).not.toBeNull(), { timeout: 5000 });
        await expect(row(canvasElement, GROUP).querySelector('[data-testid="LockIcon"]')).not.toBeNull();
    },
};
