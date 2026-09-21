import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath resolves in Storybook/Vite
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { UserRole } from '../../../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../../../utils/storybook/adminStoryDecorators';
import type { TenantLegalDraft } from '../../../../../api/tenant/legalDrafts';
import type { DistributeTenantLegalProposal } from '../../../../../api/tenant/legalProposals';
import { LegalText } from './index';

/**
 * Platform → Träger templates (ORISO-TenantService#262). The platform's published
 * imprint lives on the main tenant (1); its server-side DRAFT is owned by tenant 0.
 * "Vorlage veröffentlichen" sends exactly the saved draft revision to Träger as a
 * proposal — nothing is published anywhere.
 *
 * Real container, real hooks, mocked HTTP: these stories are where the UX is agreed
 * before the backend is on Dev.
 */

const MAIN_TENANT_ID = 1;
const PLATFORM_DRAFT_OWNER = 0;
const USER_ID = 'storybook-platform-admin';
const DRAFT_ENDPOINT = '*/service/tenantadmin/0/legal-drafts/IMPRINT';
const DISTRIBUTE_ENDPOINT = '*/service/tenantadmin/legal-proposal-distributions';

const mainTenant = {
    id: MAIN_TENANT_ID,
    name: 'Plattform',
    adminEmails: [],
    settings: { activeLanguages: ['de', 'en'] },
    theming: { logo: '', favicon: '', primaryColor: '#9e1b50', secondaryColor: '#ffffff' },
    content: {
        impressum: { de: '<h2>Impressum der Plattform</h2><p>Veröffentlichte Fassung.</p>' },
        privacy: {},
        termsAndConditions: {},
        claim: {},
        confirmTermsAndConditions: false,
        confirmPrivacy: false,
    },
};

const savedPlatformDraft: TenantLegalDraft = {
    kind: 'IMPRINT',
    content: {
        de: '<h2>Muster-Impressum für Träger</h2><p>Angaben gemäß § 5 TMG. Musterträger e. V., Musterstraße 1, 12345 Musterstadt.</p>',
        en: '<h2>Template imprint for Träger</h2><p>Details according to § 5 TMG.</p>',
    },
    revision: '9:2',
    updatedAt: '2026-09-21T09:40:00+02:00',
};

const traeger = [
    { id: 7, name: 'Träger Nordlicht' },
    { id: 12, name: 'Caritasverband Musterstadt' },
    { id: 21, name: 'Diakonie Südhang' },
];

const tenantSearch = http.get('*/service/tenantadmin/search', () =>
    HttpResponse.json({ _embedded: traeger.map((t) => ({ ...t, adminEmails: [] })), total: traeger.length }),
);

const baseHandlers = [
    http.get('*/service/users/data', () => HttpResponse.json({ id: USER_ID })),
    http.get('*/service/tenant/public/*', () => HttpResponse.json({ id: MAIN_TENANT_ID, settings: {} })),
    http.get('*/service/tenant/:id', () => HttpResponse.json(mainTenant)),
    http.get('*/service/tenantadmin/:id/legal-versions', () => HttpResponse.json([])),
    tenantSearch,
];

/** Records every distribution request so a play function can assert what was sent. */
const sent: DistributeTenantLegalProposal[] = [];

const withSavedDraft = (distribute: 'created' | 'conflict' = 'created') => [
    ...baseHandlers,
    http.get('*/service/tenantadmin/:id', ({ params }) =>
        String(params.id) === String(MAIN_TENANT_ID)
            ? HttpResponse.json(mainTenant)
            : new HttpResponse(null, { status: 404 }),
    ),
    http.get(DRAFT_ENDPOINT, () => HttpResponse.json(savedPlatformDraft)),
    http.post(DISTRIBUTE_ENDPOINT, async ({ request }) => {
        const body = (await request.json()) as DistributeTenantLegalProposal;
        sent.push(body);
        if (distribute === 'conflict') return new HttpResponse(null, { status: 409 });
        const recipientTenantIds = body.audience === 'ALL' ? traeger.map((t) => t.id) : body.tenantIds ?? [];
        return HttpResponse.json({ requestKey: body.requestKey, recipientTenantIds, proposals: [] }, { status: 201 });
    }),
];

const meta = {
    title: 'Organisms/Legal/LegalText/Platform template',
    component: LegalText,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => {
            // A platform administrator: tenant-admin role on tenant 0.
            setStoryAuth([UserRole.TenantAdmin], PLATFORM_DRAFT_OWNER);
            sent.length = 0;
            return withAdminProviders(() => (
                <div style={{ minHeight: 820, padding: 16 }}>
                    <Story />
                </div>
            ));
        },
    ],
    args: {
        tenantId: MAIN_TENANT_ID,
        draftTenantId: String(PLATFORM_DRAFT_OWNER),
        fieldName: ['content', 'impressum'],
        titleKey: 'imprint.title',
        legalType: 'imprint',
        placeHolderKey: 'settings.imprint.placeholder',
    },
} satisfies Meta<typeof LegalText>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The card first loads the tenant, the published text and the server draft. In a full
 * story run many files load at once, so the default 1 s is not enough to see it settle.
 */
const LOAD = { timeout: 8000 };

const TEMPLATE_ACTION = { name: /Vorlage veröffentlichen|Publish as template/ };

const templateButton = (canvas: ReturnType<typeof within>) => canvas.findByRole('button', TEMPLATE_ACTION, LOAD);

/**
 * Waits for the CURRENT, enabled template action and returns it. The card re-keys its
 * editor once the admin's user id has loaded, which replaces the footer buttons — a
 * reference taken before that points at a detached node that stays disabled forever.
 */
const enabledTemplateButton = async (canvas: ReturnType<typeof within>) => {
    await waitFor(() => expect(canvas.getByRole('button', TEMPLATE_ACTION)).toBeEnabled(), LOAD);
    return canvas.getByRole('button', TEMPLATE_ACTION);
};

/** A saved platform draft: the template action sits directly before Publish and is enabled. */
export const SavedDraftReadyToSend: Story = {
    parameters: { msw: { handlers: withSavedDraft() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const button = await enabledTemplateButton(canvas);
        // Order in the footer: template, publish, save draft.
        const labels = within(button.closest('[class*="actions"]') as HTMLElement)
            .getAllByRole('button')
            .map((b) => b.textContent?.trim());
        await expect(labels.slice(-3)).toEqual([
            expect.stringMatching(/Vorlage veröffentlichen|Publish as template/),
            expect.stringMatching(/Veröffentlichen|Publish/),
            expect.stringMatching(/Entwurf speichern|Save draft/),
        ]);
    },
};

/** Send to every current Träger — the default choice. */
export const SendToAllTraeger: Story = {
    parameters: { msw: { handlers: withSavedDraft() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const page = within(canvasElement.ownerDocument.body);
        const button = await enabledTemplateButton(canvas);
        await userEvent.click(button);
        const dialog = await page.findByRole('dialog');
        await expect(
            within(dialog).getByText(/Veröffentlicht wird dabei nichts|Nothing is published/),
        ).toBeInTheDocument();
        await userEvent.click(within(dialog).getByRole('button', { name: /^(Senden|Send)$/ }));
        await waitFor(() => expect(sent).toHaveLength(1));
        await expect(sent[0]).toMatchObject({ kind: 'IMPRINT', sourceRevision: '9:2', audience: 'ALL' });
        await expect(await page.findByText(/an 3 Träger gesendet|sent to 3 Träger/)).toBeInTheDocument();
    },
};

/** Send to selected Träger: Send stays disabled until at least one is chosen. */
export const SendToSelectedTraeger: Story = {
    parameters: { msw: { handlers: withSavedDraft() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const page = within(canvasElement.ownerDocument.body);
        await userEvent.click(await enabledTemplateButton(canvas));
        const dialog = await page.findByRole('dialog');
        await userEvent.click(within(dialog).getByLabelText(/Ausgewählte Träger|Selected Träger/));
        const send = within(dialog).getByRole('button', { name: /^(Senden|Send)$/ });
        await expect(send).toBeDisabled();
        await userEvent.click(await within(dialog).findByText('Diakonie Südhang'));
        await waitFor(() => expect(send).toBeEnabled());
        await userEvent.click(send);
        await waitFor(() => expect(sent).toHaveLength(1));
        await expect(sent[0]).toMatchObject({ audience: 'SELECTED', tenantIds: [21], sourceRevision: '9:2' });
    },
};

/** No saved draft yet: the action is shown, disabled, and says what is missing. */
export const NoSavedDraftYet: Story = {
    parameters: {
        msw: {
            handlers: [
                ...baseHandlers,
                http.get('*/service/tenantadmin/:id', () => HttpResponse.json(mainTenant)),
                http.get(DRAFT_ENDPOINT, () => new HttpResponse(null, { status: 404 })),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const button = await templateButton(canvas);
        await expect(button).toBeDisabled();
        await expect(button).toHaveAccessibleDescription(/Speichern Sie zuerst einen Entwurf|Save a draft first/);
    },
};

/** Typing after saving disables sending until the draft is saved again. */
export const UnsavedChangesBlockSending: Story = {
    parameters: { msw: { handlers: withSavedDraft() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        // Enabled first: the saved draft is loaded and matches the editor.
        await enabledTemplateButton(canvas);
        const editor = canvasElement.querySelector('.ProseMirror') as HTMLElement;
        await userEvent.click(editor);
        await userEvent.keyboard(' Noch nicht gespeichert.');
        await waitFor(() => expect(canvas.getByRole('button', TEMPLATE_ACTION)).toBeDisabled(), LOAD);
        await expect(canvas.getByRole('button', TEMPLATE_ACTION)).toHaveAccessibleDescription(
            /ungespeicherte Änderungen|unsaved changes/,
        );
    },
};

/** The draft changed underneath: the server answers 409, the dialog stays open and says why. */
export const ConflictWhileSending: Story = {
    parameters: { msw: { handlers: withSavedDraft('conflict') } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const page = within(canvasElement.ownerDocument.body);
        await userEvent.click(await enabledTemplateButton(canvas));
        const dialog = await page.findByRole('dialog');
        await userEvent.click(within(dialog).getByRole('button', { name: /^(Senden|Send)$/ }));
        await expect(await page.findByText(/inzwischen geändert|has changed in the meantime/)).toBeInTheDocument();
        await expect(page.getByRole('dialog')).toBeInTheDocument();
    },
};

/** A Träger admin never sees the platform action — only the platform offers templates to Träger. */
export const TraegerSeesNoTemplateAction: Story = {
    args: { tenantId: 7, draftTenantId: undefined },
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.TenantAdmin], 7);
            return <Story />;
        },
    ],
    parameters: {
        msw: {
            handlers: [
                ...baseHandlers,
                http.get('*/service/tenantadmin/:id', () => HttpResponse.json({ ...mainTenant, id: 7 })),
                http.get('*/service/tenantadmin/7/legal-drafts/IMPRINT', () => HttpResponse.json(savedPlatformDraft)),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByRole('button', { name: /^(Veröffentlichen|Publish)$/ });
        await expect(canvas.queryByRole('button', { name: /Vorlage veröffentlichen|Publish as template/ })).toBeNull();
    },
};
