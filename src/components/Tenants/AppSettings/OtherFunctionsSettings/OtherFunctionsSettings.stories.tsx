import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { UserRole } from '../../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../../utils/storybook/adminStoryDecorators';
import { OtherFunctionsSettings } from './index';

/**
 * ORISO-Admin#988 / Frank 2026-09-16: supervision moved here from the (wrongly wired)
 * "groupInternal" chat-type card — its master and seven feature toggles now sit next to
 * "Allow group chat" as their own "Supervision" block.
 */

// All authenticated calls must be mocked: an unmocked one 401s and fetchData force-logs-out,
// which navigates the story away.
const TENANT_BY_ID = '*/service/tenantadmin/:id';
const TENANT_PUBLIC = '*/service/tenant/public/*';
const TENANT_PUBLIC_BY_ID = '*/service/tenant/:id';

const handlers = (settings: Record<string, unknown> = {}) => {
    const tenant = { id: 7, name: 'Träger Süd', settings };
    return [
        http.get(TENANT_BY_ID, () => HttpResponse.json(tenant)),
        http.put(TENANT_BY_ID, () => HttpResponse.json(tenant)),
        http.get(TENANT_PUBLIC, () => HttpResponse.json({ id: 7, settings: {} })),
        http.get(TENANT_PUBLIC_BY_ID, () => HttpResponse.json({ id: 7, settings: {} })),
    ];
};

const meta = {
    title: 'Organisms/AppSettings/OtherFunctionsSettings',
    component: OtherFunctionsSettings,
    parameters: { layout: 'fullscreen' },
    args: { tenantId: '7' },
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.TenantAdmin], 7);
            return withAdminProviders(Story);
        },
    ],
} satisfies Meta<typeof OtherFunctionsSettings>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Träger admin view: "Allow group chat" followed by the Supervision block (master + seven feature switches). */
export const TenantView: Story = {
    parameters: { msw: { handlers: handlers({ featureGroupChatV2Enabled: true, featureSupervisionEnabled: true }) } },
};
