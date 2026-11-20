import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { UserRole } from '../../../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../../../utils/storybook/adminStoryDecorators';
import { DataProcessingAgreementContainer } from './index';

// Outage flag: every read fails until the play flips it (a remount must not use up the failure).
let versionsDown = true;
let versionReads = 0;

const version = {
    activationDate: '2026-07-01T12:00:00',
    content: JSON.stringify({ de: '<p>Veröffentlichter Vertrag</p>', en: '<p>Published contract</p>' }),
};

const meta = {
    title: 'Organisms/Legal/DataProcessingAgreementContainer/Load error',
    component: DataProcessingAgreementContainer,
    decorators: [(Story) => withAdminProviders(Story)],
    args: { tenantId: 7 },
    parameters: {
        layout: 'padded',
        msw: {
            handlers: [
                http.get('*/service/users/data', () => HttpResponse.json({ id: 'load-error-admin' })),
                http.get('*/service/tenant/public/*', () =>
                    HttpResponse.json({ id: 7, settings: { activeLanguages: ['de', 'en'] } }),
                ),
                http.get('*/service/tenant/7', () =>
                    HttpResponse.json({ id: 7, settings: { activeLanguages: ['de', 'en'] } }),
                ),
                http.get('*/service/tenantadmin/7/dpa/versions', () => {
                    versionReads += 1;
                    if (versionsDown) return new HttpResponse(null, { status: 500 });
                    return HttpResponse.json([version]);
                }),
                http.get('*/service/tenantadmin/7/dpa/gate', () =>
                    HttpResponse.json({ dpaPublished: true, dpaSigned: true, dpaStatus: 'SIGNED' }),
                ),
            ],
        },
    },
    beforeEach: () => {
        versionsDown = true;
        versionReads = 0;
        setStoryAuth([UserRole.TenantAdmin, UserRole.AgencyAdmin], 0);
    },
} satisfies Meta<typeof DataProcessingAgreementContainer>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The version list cannot be loaded (L9a). The editor stays withheld (editing an unknown state could
 * overwrite it); the failure is an error pop-up with "Erneut versuchen" plus a quiet line in the tile.
 * Retry reads the list again for real; once it arrives, the pop-up and the line are gone and the
 * contract is shown.
 */
export const VersionListUnavailable: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        // The request layer may raise its own generic pop-up for the failed request; pick the tile's one.
        const tilePopup = () =>
            body
                .queryAllByTestId('snackbar')
                .find((candidate) =>
                    candidate.textContent?.includes('Die früheren Fassungen konnten nicht geladen werden.'),
                );
        await waitFor(() => expect(tilePopup()).toBeDefined(), { timeout: 8000 });
        const popup = tilePopup() as HTMLElement;
        await expect(popup).toHaveAttribute('data-severity', 'error');
        await expect(popup.textContent).toContain('Auftragsverarbeitung');
        await expect(await canvas.findByText('Dieser Bereich konnte nicht geladen werden.')).toBeVisible();
        await expect(canvas.queryByRole('button', { name: 'Veröffentlichen' })).not.toBeInTheDocument();
        const readsBeforeRetry = versionReads;
        await expect(readsBeforeRetry).toBeGreaterThan(0);
        versionsDown = false;

        await userEvent.click(within(popup).getByRole('button', { name: 'Erneut versuchen' }));

        await waitFor(() => expect(versionReads).toBeGreaterThan(readsBeforeRetry));
        await waitFor(() => expect(tilePopup()).toBeUndefined());
        await waitFor(() => expect(canvas.queryByText('Dieser Bereich konnte nicht geladen werden.')).toBeNull());
        await expect(await canvas.findByRole('button', { name: 'Bearbeiten' }, { timeout: 8000 })).toBeVisible();
    },
};
