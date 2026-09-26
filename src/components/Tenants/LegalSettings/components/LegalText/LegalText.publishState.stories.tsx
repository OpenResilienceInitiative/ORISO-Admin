import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath resolves in Storybook/Vite
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { UserRole } from '../../../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../../../utils/storybook/adminStoryDecorators';
import { LegalText } from './index';

/**
 * #1066: after "Veröffentlichen" the card itself says that — and since when — instead of two
 * generic toasts; "Ratsuchende informieren?" can only be answered with Ja or Nein.
 */
const TENANT_ID = 7;

const tenant = {
    id: TENANT_ID,
    name: 'Träger Nordlicht',
    adminEmails: [],
    settings: { activeLanguages: ['de'] },
    theming: { logo: '', favicon: '', primaryColor: '#9e1b50', secondaryColor: '#ffffff' },
    content: {
        impressum: { de: '<h2>Impressum</h2><p>Träger Nordlicht e.V., Musterstraße 1, 12345 Musterstadt.</p>' },
        privacy: { de: '<h2>Datenschutzerklärung</h2><p>Verantwortlich ist der Träger Nordlicht e.V.</p>' },
        termsAndConditions: {},
        claim: {},
        confirmTermsAndConditions: false,
        confirmPrivacy: false,
    },
};

const handlers = () => {
    let stored = tenant;
    const drafts: Record<string, unknown> = {};
    return [
        http.get('*/service/users/data', () => HttpResponse.json({ id: 'storybook-tenant-admin' })),
        http.get('*/service/tenant/public/*', () => HttpResponse.json({ id: TENANT_ID, settings: {} })),
        http.get('*/service/tenant/:id', () => HttpResponse.json(stored)),
        http.get('*/service/tenantadmin/:id/legal-versions', () => HttpResponse.json([])),
        http.get('*/service/tenantadmin/:id', () => HttpResponse.json(stored)),
        http.put('*/service/tenantadmin/:id', async ({ request }) => {
            stored = (await request.json()) as typeof tenant;
            return HttpResponse.json(stored);
        }),
        http.get('*/service/tenantadmin/:id/legal-drafts/:kind', ({ params }) =>
            drafts[params.kind as string]
                ? HttpResponse.json(drafts[params.kind as string])
                : new HttpResponse(null, { status: 404 }),
        ),
        http.put('*/service/tenantadmin/:id/legal-drafts/:kind', async ({ params, request }) => {
            const body = (await request.json()) as Record<string, unknown>;
            drafts[params.kind as string] = {
                ...body,
                kind: params.kind,
                revision: `${params.kind}:1`,
                updatedAt: new Date().toISOString(),
            };
            return HttpResponse.json(drafts[params.kind as string]);
        }),
        http.delete('*/service/tenantadmin/:id/legal-drafts/:kind', ({ params }) => {
            delete drafts[params.kind as string];
            return new HttpResponse(null, { status: 204 });
        }),
    ];
};

const typeIntoEditor = async (canvasElement: HTMLElement, text: string) => {
    await waitFor(() => expect(canvasElement.querySelector('.ProseMirror[contenteditable="true"]')).not.toBeNull(), {
        timeout: 8000,
    });
    await userEvent.click(canvasElement.querySelector('.ProseMirror[contenteditable="true"]') as HTMLElement);
    await userEvent.keyboard(text);
};

const meta = {
    title: 'Organisms/Legal/LegalText/Publish state',
    component: LegalText,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.TenantAdmin], TENANT_ID);
            return withAdminProviders(() => (
                <div style={{ minHeight: 760, padding: 16 }}>
                    <Story />
                </div>
            ));
        },
    ],
    args: {
        tenantId: TENANT_ID,
        fieldName: ['content', 'impressum'],
        titleKey: 'imprint.title',
        legalType: 'imprint',
        placeHolderKey: 'settings.imprint.placeholder',
    },
} satisfies Meta<typeof LegalText>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing pending: the live text carries a persistent "Veröffentlicht". */
export const Published: Story = {
    parameters: { msw: { handlers: handlers() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByTestId('legal-publication-status', {}, { timeout: 8000 })).toHaveTextContent(
            'Veröffentlicht',
        );
    },
};

/** Right after publishing: "Veröffentlicht am <Datum, Uhrzeit>" on the card. */
export const PublishedJustNow: Story = {
    parameters: { msw: { handlers: handlers() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await typeIntoEditor(canvasElement, ' Neu: Telefon 0123 456789.');
        await userEvent.click(await canvas.findByRole('button', { name: /veröffentlichen/i }));
        await waitFor(
            () => expect(canvas.getByTestId('legal-publication-status')).toHaveTextContent(/Veröffentlicht am/),
            { timeout: 8000 },
        );
        await expect(canvas.getByText(/Neu: Telefon 0123 456789\./)).toBeVisible();
    },
};

/** "Ratsuchende informieren?": Ja informs, Nein publishes silently; Escape/X/outside publish nothing. */
export const InformAdviceSeekersQuestion: Story = {
    parameters: { msw: { handlers: handlers() } },
    args: {
        fieldName: ['content', 'privacy'],
        titleKey: 'privacy.title',
        legalType: 'privacy',
        placeHolderKey: 'settings.privacy.placeholder',
        showConfirmationModal: {
            titleKey: 'privacy.confirmation.title',
            contentKey: 'privacy.confirmation.content',
            cancelLabelKey: 'privacy.confirmation.cancel',
            okLabelKey: 'privacy.confirmation.confirm',
            field: ['content', 'confirmPrivacy'],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const page = within(canvasElement.ownerDocument.body);
        await typeIntoEditor(canvasElement, ' Ergänzt.');
        await userEvent.click(await canvas.findByRole('button', { name: /veröffentlichen/i }));
        const dialog = await page.findByRole('dialog');
        // The modal fades in; wait for the end of the transition before asserting visibility.
        await waitFor(() => expect(within(dialog).getByText('Ratsuchende informieren?')).toBeVisible());
        await expect(within(dialog).getByRole('button', { name: 'Ja' })).toBeVisible();
        await expect(within(dialog).getByRole('button', { name: 'Nein' })).toBeVisible();
    },
};
