import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- Storybook's subpath export
import { expect, userEvent, within } from 'storybook/test';
import {
    getSessionAccessToken,
    getSessionRefreshToken,
    setSessionTokens,
} from '../../../../api/auth/tokenSessionStore';
import i18n from '../../../../i18n';
import { AgencyData } from '../../../../types/agency';
import { AgencyDeletionModal } from '.';

const AGENCY = { id: '12', name: 'Caritas Beratungsstelle Mitte' } as AgencyData;

const PREVIEW = {
    adviceSeekers: 14,
    keptAdviceSeekerSessions: 3,
    openEnquiries: 2,
    consultantsDeleted: 2,
    consultantsUnassigned: 1,
    agencyAdmins: 1,
    groupChats: 1,
};

const previewOk = http.get('*/service/useradmin/agencies/:agencyId/deletion', () => HttpResponse.json(PREVIEW));

/**
 * Deleting a Beratungsstelle takes everything below it with it (ORISO-Admin#1524): the dialog says
 * what goes before anything happens, and afterwards what could not be handled.
 */
const meta = {
    title: 'Pages/Agency/AgencyDeletionModal',
    component: AgencyDeletionModal,
    args: { agencyModel: AGENCY, onClose: () => undefined },
    parameters: { msw: { handlers: [previewOk] } },
    beforeEach: async () => {
        const previousLanguage = i18n.language;
        const previousAccess = getSessionAccessToken();
        const previousRefresh = getSessionRefreshToken();
        const claims = {
            tenantId: 21,
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
} satisfies Meta<typeof AgencyDeletionModal>;
export default meta;
type Story = StoryObj<typeof meta>;

/** What goes with the Beratungsstelle, shown before the admin confirms. */
export const Preview: Story = {
    play: async ({ canvasElement }) => {
        const page = within(canvasElement.ownerDocument.body);
        const list = await page.findByTestId('agency-delete-preview');
        await expect(list).toBeInTheDocument();
        await expect(page.getByText(/14 Ratsuchende, die nur hier beraten werden/)).toBeInTheDocument();
        await expect(page.getByRole('button', { name: 'Löschen' })).toBeEnabled();
    },
};

/** Without the preview nothing can be deleted. */
export const PreviewFailed: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get(
                    '*/service/useradmin/agencies/:agencyId/deletion',
                    () => new HttpResponse(null, { status: 500 }),
                ),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const page = within(canvasElement.ownerDocument.body);
        const alert = await page.findByRole('alert');
        await expect(alert).toBeInTheDocument();
        await expect(page.getByRole('button', { name: 'Löschen' })).toBeDisabled();
    },
};

/** One counsellor could not be marked: the result names it and says how to retry. */
export const PartlyFailed: Story = {
    parameters: {
        msw: {
            handlers: [
                previewOk,
                http.delete('*/service/agencyadmin/agencies/:agencyId', () =>
                    HttpResponse.json({
                        ...PREVIEW,
                        consultantsDeleted: 1,
                        complete: false,
                        invites: 2,
                        failures: [{ kind: 'CONSULTANT', id: 'b2f0c1d4', reason: 'IllegalStateException' }],
                    }),
                ),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const page = within(canvasElement.ownerDocument.body);
        await page.findByTestId('agency-delete-preview');
        await userEvent.click(page.getByRole('button', { name: 'Löschen' }));
        const failures = await page.findByTestId('agency-delete-failures');
        await expect(failures).toBeInTheDocument();
        await expect(failures).toHaveTextContent(/Berater\*in b2f0c1d4/);
    },
};
