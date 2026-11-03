import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath the eslint node resolver can't see (resolves for tsc/Vite)
import { expect, userEvent, waitFor, within } from 'storybook/test';
import i18n from '../../../../../i18n';
import { UserRole } from '../../../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../../../utils/storybook/adminStoryDecorators';
import type { RecipientScopePolicy } from '../../../../../types/permissionPolicy';
import { SuperAdminPermissionsSettings } from '../SuperAdminPermissionsSettings';
import { TenantPermissionsSettings } from '../TenantPermissionsSettings';

/**
 * ORISO-Admin#1215 — the real "Internal group chats" tile (containers, hooks and API modules)
 * against the TenantService contract of ORISO-TenantService#321, answered by MSW. The control
 * itself is in RecipientScopeControl.stories.tsx.
 */

type Level = 'platform' | 'tenant';

const CONTROLS = '*/service/tenantadmin/controls';
const TENANT_BY_ID = '*/service/tenantadmin/:id';
const TENANT_POLICIES = '*/service/tenantadmin/:id/permission-policies';
const TENANT_PUBLIC = '*/service/tenant/public/*';
const TENANT_PUBLIC_BY_ID = '*/service/tenant/:id';
const HANDOVER_REASON_POLICIES = '*/service/users/case-handover/reason-policies';

/** `scope` undefined = a backend that does not send the field yet. */
const handlers = (scope?: RecipientScopePolicy, { putFails = false } = {}) => {
    const withScope = (body: object) => (scope ? { ...body, internalGroupChat: { recipientScope: scope } } : body);
    return [
        http.get(CONTROLS, () =>
            HttpResponse.json(withScope({ permissionsPageEnabled: true, allowedPermissionToggles: {} })),
        ),
        http.put(CONTROLS, async ({ request }) => HttpResponse.json(await request.json())),
        http.get(TENANT_POLICIES, () => HttpResponse.json(withScope({ tenantId: 7, policies: {} }))),
        http.put(TENANT_POLICIES, async ({ request }) =>
            putFails ? new HttpResponse('{}', { status: 400 }) : HttpResponse.json(await request.json()),
        ),
        http.get(TENANT_BY_ID, () => HttpResponse.json({ id: 7, name: 'Träger Süd', settings: {} })),
        http.get(TENANT_PUBLIC, () => HttpResponse.json({ id: 7, settings: {} })),
        http.get(TENANT_PUBLIC_BY_ID, () => HttpResponse.json({ id: 7, settings: {} })),
        http.get(HANDOVER_REASON_POLICIES, () => HttpResponse.json([])),
    ];
};

const Tile = ({ level }: { level: Level }) =>
    level === 'platform' ? (
        <SuperAdminPermissionsSettings tenantId="7" excludeCardKeys={['liveChat']} />
    ) : (
        <TenantPermissionsSettings tenantId="7" />
    );

const meta = {
    title: 'Organisms/Permissions/RecipientScopeTile',
    component: Tile,
    parameters: {
        layout: 'fullscreen',
        // The tile under test; its neighbours (case handover card) have their own stories.
        a11y: { context: '[data-testid="chat-type-card-groupInternal"]' },
    },
    args: { level: 'tenant' },
    decorators: [
        (Story, { args }) => {
            setStoryAuth(args.level === 'platform' ? [UserRole.TenantAdmin] : [UserRole.SingleTenantAdmin], 7);
            return withAdminProviders(Story);
        },
    ],
    beforeEach: async () => {
        const previousLanguage = i18n.language;
        await i18n.changeLanguage('de');
        return () => i18n.changeLanguage(previousLanguage);
    },
} satisfies Meta<typeof Tile>;

export default meta;
type Story = StoryObj<typeof meta>;

const control = async (canvasElement: HTMLElement) =>
    within(await within(canvasElement).findByTestId('recipient-scope-control'));

/** Träger admin when the platform made the scope a requirement: visible, locked. */
export const TraegerLockedByPlatform: Story = {
    parameters: { msw: { handlers: handlers({ value: 'TENANT', mode: 'ENFORCED', inherited: true }) } },
    play: async ({ canvasElement }) => {
        const scope = await control(canvasElement);
        await waitFor(() => expect(scope.getByRole('radio', { name: /Trägerweit/ })).toBeChecked());
        scope.getAllByRole('radio').forEach((radio) => expect(radio).toBeDisabled());
    },
};

/** Träger admin: the server rejects the save; the error shows and the edit stays. */
export const TraegerSaveRejected: Story = {
    parameters: {
        msw: { handlers: handlers({ value: 'AGENCY', mode: 'SUGGESTED', inherited: true }, { putFails: true }) },
    },
    play: async ({ canvasElement }) => {
        const scope = await control(canvasElement);
        await userEvent.click(scope.getByRole('radio', { name: /Plattformweit/ }));
        await userEvent.click(scope.getByRole('button', { name: 'Speichern' }));
        await expect(await scope.findByRole('alert')).toHaveTextContent(/^Nicht gespeichert\./);
        await expect(scope.getByRole('radio', { name: /Plattformweit/ })).toBeChecked();
    },
};

/** Platform admin on a backend that does not send the field yet: default shown read-only, with a note. */
export const PlatformWithoutBackendField: Story = {
    args: { level: 'platform' },
    parameters: { msw: { handlers: handlers() } },
    play: async ({ canvasElement }) => {
        const scope = await control(canvasElement);
        await expect(scope.getByRole('radio', { name: /Auf die Beratungsstelle begrenzt/ })).toBeChecked();
        scope.getAllByRole('radio').forEach((radio) => expect(radio).toBeDisabled());
        await expect(scope.getByText('Verfügbar nach dem nächsten Backend-Update.')).toBeVisible();
        await expect(scope.queryByRole('button', { name: 'Speichern' })).toBeNull();
    },
};
