import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactElement } from 'react';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath resolves in Storybook/Vite
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { UserRole } from '../../../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../../../utils/storybook/adminStoryDecorators';
import type { TenantLegalDraft } from '../../../../../api/tenant/legalDrafts';
import type {
    DistributeAgencyLegalProposal,
    DistributeTenantLegalProposal,
    TenantLegalTemplateVersion,
} from '../../../../../api/tenant/legalProposals';
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
/** Records every draft save, to prove "Vorlage veröffentlichen" saves before it sends. */
const savedDrafts: unknown[] = [];

/** Two template versions already sent — what the "Impressum (Vorlagen)" section lists. */
const sentTemplates: TenantLegalTemplateVersion[] = [
    {
        distributionId: 'd-2',
        sourceRevision: '9:1',
        createdAt: '2026-09-18T14:05:00+02:00',
        recipientCount: 3,
        content: { de: '<h2>Muster-Impressum</h2><p>Zweite Fassung.</p>' },
    },
    {
        distributionId: 'd-1',
        sourceRevision: '9:0',
        createdAt: '2026-09-02T10:30:00+02:00',
        recipientCount: 1,
        content: { de: '<h2>Muster-Impressum</h2><p>Erste Fassung.</p>' },
    },
];

const templateHistory = (versions: TenantLegalTemplateVersion[] = sentTemplates) =>
    http.get(DISTRIBUTE_ENDPOINT, () => HttpResponse.json(versions));

const draftSave = http.put(DRAFT_ENDPOINT, async ({ request }) => {
    const body = (await request.json()) as Pick<TenantLegalDraft, 'content'>;
    savedDrafts.push(body);
    return HttpResponse.json({ ...savedPlatformDraft, content: body.content, revision: '9:3' });
});

const withSavedDraft = (distribute: 'created' | 'conflict' = 'created') => [
    ...baseHandlers,
    templateHistory(),
    draftSave,
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
            savedDrafts.length = 0;
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

/**
 * Waits for the CURRENT, enabled template action and returns it. The card re-keys its
 * editor once the admin's user id has loaded, which replaces the footer buttons — a
 * reference taken before that points at a detached node that stays disabled forever.
 */
const enabledTemplateButton = async (canvas: ReturnType<typeof within>) => {
    await waitFor(() => expect(canvas.getByRole('button', TEMPLATE_ACTION)).toBeEnabled(), LOAD);
    return canvas.getByRole('button', TEMPLATE_ACTION);
};

const PUBLISH_PLATFORM = { name: /Impressum \(Plattform\) veröffentlichen|Publish imprint \(platform\)/ };
const SAVE_DRAFT = { name: /Entwurf speichern|Save draft/ };

const footerLabels = (button: HTMLElement) =>
    within(button.closest('[class*="actions"]') as HTMLElement)
        .getAllByRole('button')
        .map((b) => b.textContent?.trim());

/**
 * A saved draft nobody has decided about yet: new against the live text AND against the
 * last sent template, so both publish actions are offered. Nothing to save — the draft
 * is saved — so "Entwurf speichern" is not shown.
 */
export const SavedDraftReadyToSend: Story = {
    parameters: { msw: { handlers: withSavedDraft() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const button = await enabledTemplateButton(canvas);
        await expect(footerLabels(button)).toEqual([
            expect.stringMatching(/Vorlage veröffentlichen|Publish as template/),
            expect.stringMatching(/Impressum \(Plattform\) veröffentlichen|Publish imprint \(platform\)/),
        ]);
        await expect(canvas.queryByRole('button', SAVE_DRAFT)).toBeNull();
    },
};

/** The version menu: templates and platform versions in their own sections, each with its "create" row. */
export const VersionMenuSections: Story = {
    parameters: { msw: { handlers: withSavedDraft() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const page = within(canvasElement.ownerDocument.body);
        await enabledTemplateButton(canvas);
        await userEvent.click(canvas.getByRole('button', { name: /Versionsverlauf|Version history/ }));
        const menu = await page.findByRole('menu');
        const texts = within(menu)
            .getAllByRole('menuitem')
            .map((item) => item.textContent?.trim());
        await expect(texts).toEqual([
            expect.stringMatching(/Aktuelle Fassung \(Entwurf\)|Current version \(draft\)/),
            expect.stringMatching(/Impressum \(Vorlagen\)|Imprint \(templates\)/),
            expect.stringMatching(/^(Vorlage 2|Template 2)/),
            expect.stringMatching(/^(Vorlage 1|Template 1)/),
            expect.stringMatching(/Neue Vorlage erstellen|Create new template/),
            expect.stringMatching(/Impressum \(Plattform\)|Imprint \(platform\)/),
            expect.stringMatching(/Noch nicht|not.*published|Noch kein/i),
            expect.stringMatching(/Neues Impressum \(Plattform\) erstellen|Create new imprint \(platform\)/),
        ]);
        await expect(within(menu).getByText(/Gesendet .* an 3 Träger|Sent .* to 3 providers/)).toBeInTheDocument();
    },
};

/** "Neue Vorlage erstellen": the draft is now a template, and the footer offers only that. */
export const NewTemplateOffersOnlyTemplateAction: Story = {
    parameters: { msw: { handlers: withSavedDraft() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const page = within(canvasElement.ownerDocument.body);
        await enabledTemplateButton(canvas);
        await userEvent.click(canvas.getByRole('button', { name: /Versionsverlauf|Version history/ }));
        await userEvent.click(await page.findByText(/Neue Vorlage erstellen|Create new template/));
        await waitFor(() => expect(canvas.queryByRole('button', PUBLISH_PLATFORM)).toBeNull());
        await expect(canvas.getByRole('button', TEMPLATE_ACTION)).toBeEnabled();
        await expect(canvas.getByRole('button', { name: /Versionsverlauf|Version history/ })).toHaveTextContent(
            /Entwurf: Impressum \(Vorlagen\)|Draft: Imprint \(templates\)/,
        );
    },
};

/** "Neues Impressum (Plattform) erstellen": only the live publish action remains. */
export const NewPlatformTextOffersOnlyPublish: Story = {
    parameters: { msw: { handlers: withSavedDraft() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const page = within(canvasElement.ownerDocument.body);
        await enabledTemplateButton(canvas);
        await userEvent.click(canvas.getByRole('button', { name: /Versionsverlauf|Version history/ }));
        await userEvent.click(
            await page.findByText(/Neues Impressum \(Plattform\) erstellen|Create new imprint \(platform\)/),
        );
        await waitFor(() => expect(canvas.queryByRole('button', TEMPLATE_ACTION)).toBeNull());
        await expect(canvas.getByRole('button', PUBLISH_PLATFORM)).toBeEnabled();
    },
};

/** A narrow card: long action labels are cut with an ellipsis, the full text stays in the title. */
export const NarrowFooterTruncatesLabels: Story = {
    parameters: { msw: { handlers: withSavedDraft() } },
    decorators: [
        (Story) => (
            <div style={{ width: 420 }}>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await enabledTemplateButton(canvas);
        const publish = canvas.getByRole('button', PUBLISH_PLATFORM);
        await expect(publish).toHaveAttribute(
            'title',
            expect.stringMatching(/Impressum \(Plattform\) veröffentlichen|Publish imprint \(platform\)/),
        );
        const label = publish.querySelector('[class*="actionLabel"]') as HTMLElement;
        await expect(getComputedStyle(label).textOverflow).toBe('ellipsis');
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
            within(dialog).getByText(/Impressum-Vorlage an Träger senden|Send imprint template to Träger/),
        ).toBeInTheDocument();
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

/**
 * No draft and nothing typed: the live text is unchanged, so there is nothing to publish
 * or save. Nothing was sent yet either, so the current text can still go out as a template.
 */
export const NothingNewOnlyTemplateOffered: Story = {
    parameters: {
        msw: {
            handlers: [
                ...baseHandlers,
                templateHistory([]),
                draftSave,
                http.get('*/service/tenantadmin/:id', () => HttpResponse.json(mainTenant)),
                http.get(DRAFT_ENDPOINT, () => new HttpResponse(null, { status: 404 })),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await enabledTemplateButton(canvas);
        await expect(canvas.queryByRole('button', PUBLISH_PLATFORM)).toBeNull();
        await expect(canvas.queryByRole('button', SAVE_DRAFT)).toBeNull();
    },
};

/** Typing shows "Entwurf speichern"; sending a template saves first and sends that saved revision. */
export const TypingShowsSaveAndSendingSavesFirst: Story = {
    parameters: { msw: { handlers: withSavedDraft() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const page = within(canvasElement.ownerDocument.body);
        await enabledTemplateButton(canvas);
        await expect(canvas.queryByRole('button', SAVE_DRAFT)).toBeNull();
        const editor = canvasElement.querySelector('.ProseMirror') as HTMLElement;
        await userEvent.click(editor);
        await userEvent.keyboard(' Noch nicht gespeichert.');
        await expect(await canvas.findByRole('button', SAVE_DRAFT, LOAD)).toBeEnabled();
        await userEvent.click(await enabledTemplateButton(canvas));
        await waitFor(() => expect(savedDrafts).toHaveLength(1), LOAD);
        const dialog = await page.findByRole('dialog', {}, LOAD);
        await userEvent.click(within(dialog).getByRole('button', { name: /^(Senden|Send)$/ }));
        await waitFor(() => expect(sent).toHaveLength(1));
        await expect(sent[0]).toMatchObject({ sourceRevision: '9:3' });
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

/* ------------------------------------------------------------------------------------ */
/* Träger → Beratungsstellen: the same dialog one rung down (ORISO-AgencyService#303).   */
/* The server side does not exist yet; `offerTemplatesToAgencies` is off in the app and  */
/* on here, so the UX can be agreed before the endpoint is built.                        */
/* ------------------------------------------------------------------------------------ */

const TRAEGER_ID = 7;
const traegerDraft: TenantLegalDraft = { ...savedPlatformDraft, revision: '41:3' };
const agencies = [
    { id: 101, name: 'Beratungsstelle Nordlicht Mitte' },
    { id: 102, name: 'Beratungsstelle Nordlicht Süd' },
];
const sentToAgencies: DistributeAgencyLegalProposal[] = [];

const traegerHandlers = [
    ...baseHandlers,
    http.get('*/service/tenantadmin/:id', () =>
        HttpResponse.json({ ...mainTenant, id: TRAEGER_ID, name: 'Träger Nordlicht' }),
    ),
    http.get('*/service/tenantadmin/7/legal-drafts/IMPRINT', () => HttpResponse.json(traegerDraft)),
    http.get('*/service/agencyadmin/agencies', () =>
        HttpResponse.json({ _embedded: agencies.map((agency) => ({ _embedded: agency })), total: agencies.length }),
    ),
    http.post('*/service/agencyadmin/legal-proposal-distributions', async ({ request }) => {
        const body = (await request.json()) as DistributeAgencyLegalProposal;
        sentToAgencies.push(body);
        const recipientAgencyIds = body.audience === 'ALL' ? agencies.map((a) => a.id) : body.agencyIds ?? [];
        return HttpResponse.json({ requestKey: body.requestKey, recipientAgencyIds }, { status: 201 });
    }),
];

const asTraeger = (Story: () => ReactElement) => {
    setStoryAuth([UserRole.TenantAdmin], TRAEGER_ID);
    sentToAgencies.length = 0;
    return <Story />;
};

/** A Träger offers its saved draft to selected Beratungsstellen — same dialog, other words. */
export const TraegerSendsTemplateToSelectedAgencies: Story = {
    args: { tenantId: TRAEGER_ID, draftTenantId: undefined, offerTemplatesToAgencies: true },
    decorators: [asTraeger],
    parameters: { msw: { handlers: traegerHandlers } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const page = within(canvasElement.ownerDocument.body);
        await userEvent.click(await enabledTemplateButton(canvas));
        const dialog = await page.findByRole('dialog');
        await expect(
            within(dialog).getByText(
                /Impressum-Vorlage an Beratungsstellen senden|Send imprint template to counselling centres/,
            ),
        ).toBeInTheDocument();
        await userEvent.click(
            within(dialog).getByLabelText(/Ausgewählte Beratungsstellen|Selected counselling centres/),
        );
        await userEvent.click(await within(dialog).findByText('Beratungsstelle Nordlicht Süd'));
        const send = within(dialog).getByRole('button', { name: /^(Senden|Send)$/ });
        await waitFor(() => expect(send).toBeEnabled());
        await userEvent.click(send);
        await waitFor(() => expect(sentToAgencies).toHaveLength(1));
        await expect(sentToAgencies[0]).toMatchObject({
            kind: 'IMPRINT',
            sourceRevision: '41:3',
            audience: 'SELECTED',
            agencyIds: [102],
        });
        await expect(
            await page.findByText(/an 1 Beratungsstelle gesendet|sent to 1 counselling centre/),
        ).toBeInTheDocument();
    },
};

/** Send to all of the Träger's Beratungsstellen. */
export const TraegerSendsTemplateToAllAgencies: Story = {
    args: { tenantId: TRAEGER_ID, draftTenantId: undefined, offerTemplatesToAgencies: true },
    decorators: [asTraeger],
    parameters: { msw: { handlers: traegerHandlers } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const page = within(canvasElement.ownerDocument.body);
        await userEvent.click(await enabledTemplateButton(canvas));
        const dialog = await page.findByRole('dialog');
        await userEvent.click(within(dialog).getByRole('button', { name: /^(Senden|Send)$/ }));
        await waitFor(() => expect(sentToAgencies).toHaveLength(1));
        await expect(sentToAgencies[0]).toMatchObject({ audience: 'ALL', sourceRevision: '41:3' });
        await expect(
            await page.findByText(/an 2 Beratungsstellen gesendet|sent to 2 counselling centres/),
        ).toBeInTheDocument();
    },
};
