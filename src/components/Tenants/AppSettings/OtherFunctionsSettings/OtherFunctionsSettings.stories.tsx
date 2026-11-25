import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { UserRole } from '../../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../../utils/storybook/adminStoryDecorators';
import { OtherFunctionsSettings } from './index';

/**
 * The tile of the Träger tab "Weitere" (ORISO-Admin#1577): topics and counsellor statistics in one
 * folding section. Calls, group chats, Team-Chat and supervision live in Funktionszugriff.
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
    title: 'Settings/Einstellungen/Weitere/OtherFunctionsSettings',
    id: 'organisms-appsettings-otherfunctionssettings',
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

/** Träger admin view: topics on, statistics off, each with what it does. */
export const TenantView: Story = {
    parameters: { msw: { handlers: handlers({ featureTopicsEnabled: true, featureStatisticsEnabled: false }) } },
};

export const HelpSlideshow: Story = {
    ...TenantView,
    // One slide (topics and statistics): the explanation opens without steps.
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(
            await canvas.findByRole('button', { name: /erklärung öffnen|open explanation/i }, { timeout: 8000 }),
        );
        const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog');
        await waitFor(() => expect(dialog).toBeVisible());
    },
};
