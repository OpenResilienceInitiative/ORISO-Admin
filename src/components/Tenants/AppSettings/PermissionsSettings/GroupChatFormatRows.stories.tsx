import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath the eslint node resolver can't see (resolves for tsc/Vite)
import { expect, waitFor } from 'storybook/test';
import { UserRole } from '../../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../../utils/storybook/adminStoryDecorators';
import { AgencyPermissionsSettings } from './AgencyPermissionsSettings';
import { SuperAdminPermissionsSettings } from './SuperAdminPermissionsSettings';
import { TenantPermissionsSettings } from './TenantPermissionsSettings';

/**
 * ORISO-Admin#988 — "Internal group chats" and "Conversation circles" as two separately switchable
 * rows in the group formats card. The same card and the same policy control on all three levels;
 * a format forced off above stays visible and read-only.
 */

const INTERNAL = 'featureInternalGroupChatEnabled';
const CIRCLES = 'featureSelfHelpGroupsEnabled';

type Level = 'platform' | 'tenant' | 'agency';

// Every authenticated call must be mocked: an unmocked one 401s and force-logs-out the story.
const CONTROLS = '*/service/tenantadmin/controls';
const TENANT_BY_ID = '*/service/tenantadmin/:id';
const TENANT_POLICIES = '*/service/tenantadmin/:id/permission-policies';
const AGENCY_BY_ID = '*/service/agencyadmin/agencies/:id';
const TENANT_PUBLIC = '*/service/tenant/public/*';
const TENANT_PUBLIC_BY_ID = '*/service/tenant/:id';
const HANDOVER_REASON_POLICIES = '*/service/users/case-handover/reason-policies';

type Policy = { value: boolean; mode: 'ENFORCED' | 'SUGGESTED'; inherited?: boolean };

const suggested = (value: boolean): Policy => ({ value, mode: 'SUGGESTED' });

const formatPolicies = (overrides: Record<string, Policy> = {}) => ({
    featureGroupChatV2Enabled: suggested(true),
    [INTERNAL]: suggested(true),
    [CIRCLES]: suggested(true),
    ...overrides,
});

const handlers = ({
    policies = formatPolicies(),
    tenantSettings = { featureGroupChatV2Enabled: true, [INTERNAL]: true, [CIRCLES]: true },
    agencySettings = { featureGroupChatV2Enabled: true, [INTERNAL]: true, [CIRCLES]: true },
}: {
    policies?: Record<string, Policy>;
    tenantSettings?: Record<string, unknown>;
    agencySettings?: Record<string, unknown>;
} = {}) => {
    const agency = { _embedded: { id: '55', name: 'Beratungsstelle Nord', tenantId: 7, settings: agencySettings } };
    const controls = { permissionsPageEnabled: true, allowedPermissionToggles: {}, permissionPolicies: policies };
    return [
        http.get(CONTROLS, () => HttpResponse.json(controls)),
        http.put(CONTROLS, async ({ request }) => HttpResponse.json(await request.json())),
        http.get(TENANT_POLICIES, () => HttpResponse.json({ tenantId: 7, policies })),
        http.put(TENANT_POLICIES, async ({ request }) => HttpResponse.json(await request.json())),
        http.get(TENANT_BY_ID, () => HttpResponse.json({ id: 7, name: 'Träger Süd', settings: tenantSettings })),
        http.get(AGENCY_BY_ID, () => HttpResponse.json(agency)),
        http.put(AGENCY_BY_ID, () => HttpResponse.json(agency)),
        http.get(TENANT_PUBLIC, () => HttpResponse.json({ id: 7, settings: {} })),
        http.get(TENANT_PUBLIC_BY_ID, () => HttpResponse.json({ id: 7, settings: {} })),
        http.get(HANDOVER_REASON_POLICIES, () => HttpResponse.json([])),
    ];
};

const LevelView = ({ level }: { level: Level }): ReactElement => {
    if (level === 'platform') return <SuperAdminPermissionsSettings tenantId="7" excludeCardKeys={['liveChat']} />;
    if (level === 'tenant') return <TenantPermissionsSettings tenantId="7" />;
    return <AgencyPermissionsSettings agencyId="55" />;
};

const ROLES: Record<Level, UserRole[]> = {
    platform: [UserRole.TenantAdmin],
    tenant: [UserRole.SingleTenantAdmin],
    agency: [UserRole.AgencyAdmin],
};

const meta = {
    title: 'Organisms/Permissions/GroupChatFormatRows',
    component: LevelView,
    parameters: { layout: 'fullscreen' },
    args: { level: 'platform' },
    decorators: [
        (Story, { args }) => {
            setStoryAuth(ROLES[args.level], 7);
            return withAdminProviders(Story);
        },
    ],
} satisfies Meta<typeof LevelView>;

export default meta;
type Story = StoryObj<typeof meta>;

const row = (root: HTMLElement, field: string) =>
    root.querySelector(`[data-feature-policy="${field}"]`) as HTMLElement | null;

const expectBothRows = async (root: HTMLElement) => {
    await waitFor(() => expect(row(root, INTERNAL)).not.toBeNull(), { timeout: 5000 });
    await expect(row(root, CIRCLES)).not.toBeNull();
};

/** Platform admin: both formats in the group formats card, both editable. */
export const PlatformLevel: Story = {
    args: { level: 'platform' },
    parameters: { msw: { handlers: handlers() } },
    play: async ({ canvasElement }) => expectBothRows(canvasElement),
};

/** Träger admin: same card, same rows, same control. */
export const TraegerLevel: Story = {
    args: { level: 'tenant' },
    parameters: { msw: { handlers: handlers() } },
    play: async ({ canvasElement }) => expectBothRows(canvasElement),
};

/** Träger admin: the platform enforced conversation circles off — the row stays visible, read-only. */
export const TraegerCirclesForcedOff: Story = {
    args: { level: 'tenant' },
    parameters: {
        msw: {
            handlers: handlers({
                policies: formatPolicies({ [CIRCLES]: { value: false, mode: 'ENFORCED', inherited: true } }),
            }),
        },
    },
    play: async ({ canvasElement }) => {
        await expectBothRows(canvasElement);
        const circles = row(canvasElement, CIRCLES) as HTMLElement;
        await waitFor(() => expect(circles.querySelector('[data-testid="BlockIcon"]')).not.toBeNull());
    },
};

/** Beratungsstelle admin: same card, same rows. */
export const AgencyLevel: Story = {
    args: { level: 'agency' },
    parameters: { msw: { handlers: handlers() } },
    play: async ({ canvasElement }) => expectBothRows(canvasElement),
};

/** Beratungsstelle admin: the Träger forced group chats off — both formats disabled, not hidden. */
export const AgencyGroupChatsForcedOff: Story = {
    args: { level: 'agency' },
    parameters: {
        msw: {
            handlers: handlers({
                agencySettings: {
                    featureGroupChatV2Enabled: true,
                    [INTERNAL]: true,
                    [CIRCLES]: true,
                    agencyAdminControls: { allowedPermissionToggles: { groupChat: false } },
                },
            }),
        },
    },
    play: async ({ canvasElement }) => {
        await expectBothRows(canvasElement);
        await expect(
            (row(canvasElement, INTERNAL) as HTMLElement).querySelector('[data-testid="BlockIcon"]'),
        ).not.toBeNull();
        await expect(
            (row(canvasElement, CIRCLES) as HTMLElement).querySelector('[data-testid="BlockIcon"]'),
        ).not.toBeNull();
    },
};
