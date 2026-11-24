import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- Storybook's subpath export
import { expect, userEvent, within } from 'storybook/test';
import {
    getSessionAccessToken,
    getSessionRefreshToken,
    setSessionTokens,
} from '../../../../api/auth/tokenSessionStore';
import i18n from '../../../../i18n';
import { TenantDeletionModal } from '.';

const PREVIEW = { agencies: 3, consultants: 7, adviceSeekers: 40, agencyAdmins: 2, tenantAdmins: 1, openInvites: 1 };

const previewOk = http.get('*/service/useradmin/tenants/:tenantId/deletion-blockers', () =>
    HttpResponse.json({ deletable: false, ...PREVIEW }),
);

/**
 * Deleting a Träger takes everything below it with it (ORISO-Admin#1525): the platform
 * administrator sees what goes before confirming, and afterwards what could not be handled.
 */
const meta = {
    title: 'Pages/Tenants/TenantDeletionModal',
    component: TenantDeletionModal,
    args: { tenant: { id: 21, name: 'Caritas Nord' }, onClose: () => undefined },
    decorators: [
        (Story) => (
            <QueryClientProvider client={new QueryClient()}>
                <Story />
            </QueryClientProvider>
        ),
    ],
    parameters: { msw: { handlers: [previewOk] } },
    beforeEach: async () => {
        const previousLanguage = i18n.language;
        const previousAccess = getSessionAccessToken();
        const previousRefresh = getSessionRefreshToken();
        const claims = {
            tenantId: 0,
            exp: Math.floor(Date.now() / 1000) + 3600,
            realm_access: { roles: ['tenant-admin', 'agency-admin'] },
        };
        setSessionTokens(`${btoa('{}')}.${btoa(JSON.stringify(claims))}.fixture`, 'storybook-refresh-fixture');
        await i18n.changeLanguage('de');
        return () => {
            setSessionTokens(previousAccess, previousRefresh);
            i18n.changeLanguage(previousLanguage);
        };
    },
} satisfies Meta<typeof TenantDeletionModal>;
export default meta;
type Story = StoryObj<typeof meta>;

/** What goes with the Träger, shown before the platform administrator confirms. */
export const Preview: Story = {
    play: async ({ canvasElement }) => {
        const page = within(canvasElement.ownerDocument.body);
        await expect(await page.findByTestId('tenant-delete-preview')).toBeInTheDocument();
        await expect(page.getByText(/3 Beratungsstellen mit allem/)).toBeInTheDocument();
        await expect(page.getByRole('button', { name: 'Löschen' })).toBeEnabled();
    },
};

/** Without the preview nothing can be deleted. */
export const PreviewFailed: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get(
                    '*/service/useradmin/tenants/:tenantId/deletion-blockers',
                    () => new HttpResponse(null, { status: 500 }),
                ),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const page = within(canvasElement.ownerDocument.body);
        await expect(await page.findByRole('alert')).toBeInTheDocument();
        await expect(page.getByRole('button', { name: 'Löschen' })).toBeDisabled();
    },
};

/** One counsellor could not be marked: the result names it and says how to retry. */
export const PartlyFailed: Story = {
    parameters: {
        msw: {
            handlers: [
                previewOk,
                http.delete('*/service/tenant/:tenantId', () =>
                    HttpResponse.json(
                        {
                            complete: false,
                            invites: 1,
                            agencies: 3,
                            consultants: 0,
                            adviceSeekers: 0,
                            agencyAdmins: 2,
                            tenantAdmins: 1,
                            failures: [{ kind: 'CONSULTANT', id: 'b2f0c1d4', reason: 'IllegalStateException' }],
                        },
                        { status: 202 },
                    ),
                ),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const page = within(canvasElement.ownerDocument.body);
        await page.findByTestId('tenant-delete-preview');
        await userEvent.click(page.getByRole('button', { name: 'Löschen' }));
        const failures = await page.findByTestId('tenant-delete-failures');
        await expect(failures).toHaveTextContent(/Berater\*in b2f0c1d4/);
    },
};

/** The main tenant of a single-domain installation is refused with a clear message. */
export const MainTenantRefused: Story = {
    parameters: {
        msw: {
            handlers: [
                previewOk,
                http.delete(
                    '*/service/tenant/:tenantId',
                    () => new HttpResponse(null, { status: 409, headers: { 'X-Reason': 'MAIN_TENANT_NOT_DELETABLE' } }),
                ),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const page = within(canvasElement.ownerDocument.body);
        await page.findByTestId('tenant-delete-preview');
        await userEvent.click(page.getByRole('button', { name: 'Löschen' }));
        await expect(await page.findByText(/Haupt-Träger/)).toBeInTheDocument();
    },
};
