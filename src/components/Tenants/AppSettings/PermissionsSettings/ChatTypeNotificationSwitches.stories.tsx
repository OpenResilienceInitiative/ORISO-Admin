import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath the eslint node resolver can't see (resolves for tsc/Vite)
import { expect, userEvent, waitFor, within } from 'storybook/test';
import i18n from '../../../../i18n';
import { UserRole } from '../../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../../utils/storybook/adminStoryDecorators';
import { TenantPermissionsSettings } from './TenantPermissionsSettings';
import type { ChatTypeCardKey } from './types';

/**
 * FE#1725 stories 38–39: email/browser switches sit on each conversation-type tile. Advice-seeker
 * channels save through the Träger permission policies (TenantService). The internal group chats
 * tile shows counsellor switches that stay disabled until T7 adds the TenantService fields.
 */

type Policy = { value: boolean; mode: 'ENFORCED' | 'SUGGESTED'; inherited?: boolean };
type PolicyWrite = { tenantId: number; policies: Record<string, Policy> };

const CONTROLS = '*/service/tenantadmin/controls';
const TENANT_BY_ID = '*/service/tenantadmin/:id';
const TENANT_POLICIES = '*/service/tenantadmin/:id/permission-policies';
const TENANT_PUBLIC = '*/service/tenant/public/*';
const TENANT_PUBLIC_BY_ID = '*/service/tenant/:id';
const HANDOVER_REASON_POLICIES = '*/service/users/case-handover/reason-policies';

// Stored like on dev: TenantService defaults, live-chat email off.
const STORED: Record<string, Policy> = {
    featureAskerEmailAgencyCounsellingEnabled: { value: true, mode: 'SUGGESTED' },
    featureAskerEmailLiveChatEnabled: { value: false, mode: 'SUGGESTED' },
    featureAskerEmailSelfHelpEnabled: { value: true, mode: 'SUGGESTED' },
    featureAskerBrowserAgencyCounsellingEnabled: { value: true, mode: 'SUGGESTED' },
    featureAskerBrowserLiveChatEnabled: { value: true, mode: 'SUGGESTED' },
    featureAskerBrowserSelfHelpEnabled: { value: true, mode: 'SUGGESTED' },
};

const writes: PolicyWrite[] = [];

const handlers = () => {
    let policies = { ...STORED };
    writes.length = 0;
    return [
        http.get(CONTROLS, () =>
            HttpResponse.json({ permissionsPageEnabled: true, allowedPermissionToggles: {}, permissionPolicies: {} }),
        ),
        http.get(TENANT_POLICIES, () => HttpResponse.json({ tenantId: 7, policies })),
        http.put(TENANT_POLICIES, async ({ request }) => {
            const body = (await request.json()) as PolicyWrite;
            writes.push(body);
            policies = body.policies;
            return HttpResponse.json(body);
        }),
        http.get(TENANT_BY_ID, () => HttpResponse.json({ id: 7, name: 'Träger Süd', settings: {} })),
        http.get(TENANT_PUBLIC, () => HttpResponse.json({ id: 7, settings: {} })),
        http.get(TENANT_PUBLIC_BY_ID, () => HttpResponse.json({ id: 7, settings: {} })),
        http.get(HANDOVER_REASON_POLICIES, () => HttpResponse.json([])),
    ];
};

const View = ({ excludeCardKeys }: { excludeCardKeys?: ChatTypeCardKey[] }): ReactElement => (
    <TenantPermissionsSettings tenantId="7" excludeCardKeys={excludeCardKeys} />
);

const meta = {
    title: 'Organisms/Permissions/ChatTypeNotificationSwitches',
    component: View,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.SingleTenantAdmin], 7);
            return withAdminProviders(Story);
        },
    ],
} satisfies Meta<typeof View>;

export default meta;
type Story = StoryObj<typeof meta>;

const t = (key: string) => i18n.t(key);
const literal = (key: string) => new RegExp(t(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const trigger = (root: HTMLElement, field: string) => {
    const wrapper = root.querySelector<HTMLElement>(`[data-feature-policy="${field}"]`);
    if (!wrapper) throw new Error(`no control for ${field}`);
    return within(wrapper).getByRole('button', { name: literal('tenants.permissions.policy.openMenu') });
};
const tile = async (root: HTMLElement, key: ChatTypeCardKey) => {
    await waitFor(() => expect(root.querySelector(`[data-testid="chat-type-card-${key}"]`)).not.toBeNull(), {
        timeout: 5000,
    });
    return root.querySelector(`[data-testid="chat-type-card-${key}"]`) as HTMLElement;
};

/** Träger admin: every type tile carries its own switches; live-chat email saves and stays on. */
export const SwitchesOnTiles: Story = {
    parameters: { msw: { handlers: handlers() } },
    play: async ({ canvasElement }) => {
        const liveChat = await tile(canvasElement, 'liveChat');
        await waitFor(() =>
            expect(trigger(liveChat, 'featureAskerEmailLiveChatEnabled')).toHaveAccessibleName(
                literal('tenants.permissions.policy.deactivationSuggested'),
            ),
        );
        const [counselling, circles] = await Promise.all([
            tile(canvasElement, 'oneOnOne'),
            tile(canvasElement, 'group'),
        ]);
        await expect(trigger(counselling, 'featureAskerEmailAgencyCounsellingEnabled')).toBeEnabled();
        await expect(trigger(counselling, 'featureAskerBrowserAgencyCounsellingEnabled')).toBeEnabled();
        await expect(trigger(circles, 'featureAskerEmailSelfHelpEnabled')).toBeEnabled();
        await expect(trigger(circles, 'featureAskerBrowserSelfHelpEnabled')).toBeEnabled();
        await expect(within(canvasElement).queryByText(t('tenants.permissions.asker.channels.title'))).toBeNull();

        await userEvent.click(trigger(liveChat, 'featureAskerEmailLiveChatEnabled'));
        await userEvent.click(
            within(document.body).getByRole('button', { name: t('tenants.permissions.policy.activationSuggested') }),
        );
        await waitFor(() => expect(writes.at(-1)?.policies.featureAskerEmailLiveChatEnabled?.value).toBe(true));
        await waitFor(() =>
            expect(trigger(liveChat, 'featureAskerEmailLiveChatEnabled')).toHaveAccessibleName(
                literal('tenants.permissions.policy.activationSuggested'),
            ),
        );
    },
};

/** Internal group chats: counsellor switches visible, disabled with the reason, until T7. */
export const InternalGroupChatsAwaitBackend: Story = {
    parameters: { msw: { handlers: handlers() } },
    play: async ({ canvasElement }) => {
        const card = await tile(canvasElement, 'groupInternal');
        await waitFor(() => expect(trigger(card, 'featureConsultantEmailInternalGroupEnabled')).toBeDisabled());
        await expect(trigger(card, 'featureConsultantBrowserInternalGroupEnabled')).toBeDisabled();
        await expect(within(card).getByText(t('tenants.permissions.card.notifications.consultantTitle'))).toBeTruthy();
        await expect(within(card).getAllByText(t('tenants.permissions.card.notifications.awaitsBackend'))).toHaveLength(
            2,
        );
    },
};

/** Per-Träger global settings page hides the live-chat tile: its switches stay on the advice-seeker card. */
export const HiddenLiveChatTile: Story = {
    args: { excludeCardKeys: ['liveChat'] },
    parameters: { msw: { handlers: handlers() } },
    play: async ({ canvasElement }) => {
        await tile(canvasElement, 'oneOnOne');
        const canvas = within(canvasElement);
        await expect(await canvas.findByText(t('tenants.permissions.asker.channels.title'))).toBeTruthy();
        await expect(
            canvas.getByRole('button', {
                name: (name) => name.startsWith(`${t('tenants.permissions.asker.channels.emailLiveChat')}:`),
            }),
        ).toBeEnabled();
    },
};
