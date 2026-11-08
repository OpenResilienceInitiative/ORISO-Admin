import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath resolves in Storybook/Vite
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { UserRole } from '../../../enums/UserRole';
import { setStoryAuth, withSeededAdminProviders } from '../../../utils/storybook/adminStoryDecorators';
import { TENANT_DATA_KEY } from '../../../hooks/useTenantData.hook';
import type { TenantData } from '../../../types/tenant';
import { LegalSettings } from './index';

/**
 * The legal tab of a Träger as tiles: data processing agreement ("Vertragsunterlagen"), imprint and privacy
 * statement, each folded up to a header with icon, title and state. The agreement starts unfolded. The explanation
 * button (i) and the help text sit at the top of the unfolded content, never in a header.
 */
const TENANT_ID = 7;
const TITLES = {
    agreement: /^(Vertragsunterlagen|Contract documents)/,
    imprint: /^(Impressum|Legal notice)/,
    privacy: /^(Datenschutzerklärung|Privacy policy)/,
};
const EXPLANATION = /erklärung öffnen|open explanation/i;
const PUBLISHED = /^(Veröffentlicht|Published)$/;
const DRAFT = /^(Entwurf|Draft)$/;

/**
 * What this change introduces is audited: the tile headers and the introduction above each editor. The editor inside
 * has findings of its own (they also fail the existing legal text stories on `dev`) and is not part of this story.
 */
const AUDITED = { include: [['[data-collapsible-tile] > h3'], ['[data-legal-document-intro]']] };

const tenant = {
    id: TENANT_ID,
    name: 'Träger Nordlicht',
    adminEmails: [],
    settings: { activeLanguages: ['de', 'en'] },
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

const agreementVersion = {
    activationDate: '2026-07-13T10:22:00',
    content: JSON.stringify({
        de: '<h1>Vertragsunterlagen</h1><p>Veröffentlichte Fassung: Weisungsbindung, Vertraulichkeit, TOMs.</p>',
        en: '<h1>Contract documents</h1><p>Published version: instruction binding, confidentiality, TOMs.</p>',
    }),
};

const handlers = () => [
    http.get('*/service/users/data', () => HttpResponse.json({ id: 'storybook-tenant-admin' })),
    http.get('*/service/tenant/public/*', () => HttpResponse.json({ id: TENANT_ID, settings: {} })),
    http.get('*/service/tenant/:id', () => HttpResponse.json(tenant)),
    http.get('*/service/tenantadmin/:id/legal-versions', () => HttpResponse.json([])),
    http.get('*/service/tenantadmin/:id/legal-proposals', () => HttpResponse.json([])),
    http.get('*/service/tenantadmin/:id/legal-draft-archives', () => HttpResponse.json([])),
    http.get('*/service/agencyadmin/legal-proposal-distributions', () => HttpResponse.json([])),
    http.get('*/service/tenantadmin/:id/legal-drafts/:kind', () => new HttpResponse(null, { status: 404 })),
    http.get('*/service/tenantadmin/:id/dpa/versions', () => HttpResponse.json([agreementVersion])),
    http.get('*/service/tenantadmin/:id/dpa/gate', () =>
        HttpResponse.json({ dpaPublished: true, dpaSigned: true, dpaStatus: 'VALID' }),
    ),
    http.get('*/service/tenantadmin/:id/dpa/status', () =>
        HttpResponse.json({ dpaStatus: 'VALID', newCounsellingAllowed: true }),
    ),
    http.get('*/service/tenantadmin/:id', () => HttpResponse.json(tenant)),
];

const meta = {
    title: 'Organisms/Legal/LegalSettings/Tiles',
    component: LegalSettings,
    parameters: { layout: 'padded', msw: { handlers: handlers() } },
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.TenantAdmin], TENANT_ID);
            // As in the app: the tenant is already loaded when this tab opens.
            return withSeededAdminProviders(
                () => (
                    <div style={{ minHeight: 760, padding: 16 }}>
                        <Story />
                    </div>
                ),
                (client) => client.setQueryData([TENANT_DATA_KEY, TENANT_ID], tenant as unknown as TenantData),
            );
        },
    ],
    args: { tenantId: TENANT_ID, collapsible: true },
} satisfies Meta<typeof LegalSettings>;

export default meta;
type Story = StoryObj<typeof meta>;

// The tile header is the button inside the level-3 heading; a chapter chip of the editor can carry the same words.
const header = async (canvas: ReturnType<typeof within>, title: RegExp) =>
    within(await canvas.findByRole('heading', { level: 3, name: title }, { timeout: 10000 })).getByRole('button');
const tileOf = (button: HTMLElement) => button.closest('section') as HTMLElement;

/** Only the agreement is unfolded; every header carries its state, and none carries the explanation button. */
export const Tiles: Story = {
    parameters: { a11y: { context: AUDITED } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const agreement = await header(canvas, TITLES.agreement);
        const imprint = await header(canvas, TITLES.imprint);
        const privacy = await header(canvas, TITLES.privacy);

        await expect(agreement).toHaveAttribute('aria-expanded', 'true');
        await expect(imprint).toHaveAttribute('aria-expanded', 'false');
        await expect(privacy).toHaveAttribute('aria-expanded', 'false');
        await waitFor(() => expect(within(agreement).getByText(PUBLISHED)).toBeVisible());
        await waitFor(() => expect(within(imprint).getByText(PUBLISHED)).toBeVisible());

        // One explanation button, in the unfolded agreement, and none inside any heading.
        await expect(canvas.getAllByRole('button', { name: EXPLANATION })).toHaveLength(1);
        canvasElement.querySelectorAll('h3').forEach((heading) => {
            expect(within(heading as HTMLElement).queryByRole('button', { name: EXPLANATION })).toBeNull();
        });
        await expect(within(tileOf(agreement)).getByRole('button', { name: EXPLANATION })).toBeVisible();
    },
};

/** Folding the agreement takes its explanation button with it; unfolding the imprint brings its own. */
export const FoldAndUnfold: Story = {
    parameters: { a11y: { context: AUDITED } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const agreement = await header(canvas, TITLES.agreement);
        const imprint = await header(canvas, TITLES.imprint);

        await userEvent.click(agreement);
        await expect(agreement).toHaveAttribute('aria-expanded', 'false');
        await waitFor(() => expect(canvas.queryByRole('button', { name: EXPLANATION })).toBeNull());

        await userEvent.click(imprint);
        await expect(imprint).toHaveAttribute('aria-expanded', 'true');
        const explanation = await within(tileOf(imprint)).findByRole('button', { name: EXPLANATION });
        await expect(explanation).toBeVisible();
        await expect(
            within(imprint.closest('h3') as HTMLElement).queryByRole('button', { name: EXPLANATION }),
        ).toBeNull();
    },
};

/** Typed text survives folding the tile up, and the header says draft while it differs from the live text. */
export const DraftSurvivesFolding: Story = {
    parameters: { a11y: { context: AUDITED } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const imprint = await header(canvas, TITLES.imprint);
        await userEvent.click(imprint);
        const tile = within(tileOf(imprint));

        await userEvent.click(await tile.findByRole('button', { name: /Bearbeiten|Edit/ }));
        const editor = (): HTMLElement =>
            tileOf(imprint).querySelector('.ProseMirror[contenteditable="true"]') as HTMLElement;
        await waitFor(() => expect(editor()).not.toBeNull(), { timeout: 8000 });
        await userEvent.click(editor());
        await userEvent.keyboard(' Neu: Telefon 0123 456789.');
        await waitFor(() => expect(within(imprint).getByText(DRAFT)).toBeVisible());

        await userEvent.click(imprint);
        await userEvent.click(imprint);

        await expect(within(imprint).getByText(DRAFT)).toBeVisible();
        await expect(tile.getByText(/Neu: Telefon 0123 456789\./)).toBeVisible();
    },
};
