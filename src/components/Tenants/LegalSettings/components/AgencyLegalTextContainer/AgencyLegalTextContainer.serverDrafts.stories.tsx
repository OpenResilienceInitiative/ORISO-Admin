import type { Meta, StoryObj } from '@storybook/react-vite';
import { delay, http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath resolves in Storybook/Vite
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { UserRole } from '../../../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../../../utils/storybook/adminStoryDecorators';
import { legalDraftKey } from '../../utils/legalDraftStorage';
import type { AgencyLegalDraft } from '../../../../../api/agency/legalDrafts';
import { AgencyLegalTextContainer } from '.';

const AGENCY_ID = 55;
const TENANT_ID = 7;
const USER_ID = 'storybook-agency-admin';
const DRAFT_ENDPOINT = '*/service/agencyadmin/agencies/:id/legal-drafts/DPP';

const agencyData = {
    id: AGENCY_ID,
    tenantId: TENANT_ID,
    name: 'Beratungsstelle Nordlicht',
    topics: [],
    content: {
        privacy: {
            de: '<h2>Veröffentlichte Datenschutzerklärung</h2><p>Diese Fassung ist derzeit öffentlich.</p>',
            en: '<h2>Published privacy policy</h2><p>This version is currently public.</p>',
        },
        privacyConsent: { de: 'Einwilligung {{legal_links}}', en: 'Consent {{legal_links}}' },
    },
} as any;

const tenant = {
    id: TENANT_ID,
    name: 'Träger Nordlicht',
    settings: { activeLanguages: ['de', 'en'] },
    content: {
        privacy: { de: '<p>Geerbte Trägerfassung</p>', en: '<p>Inherited tenant version</p>' },
        privacyConsent: { de: 'Träger-Einwilligung', en: 'Tenant consent' },
    },
};

const persistedDraft: AgencyLegalDraft = {
    kind: 'DPP',
    content: {
        de: '<h2>Server-Entwurf der Beratungsstelle</h2><p>Noch nicht veröffentlicht.</p>',
        en: '<h2>Agency server draft</h2><p>Not published yet.</p>',
    },
    consentText: { de: 'Entwurfs-Einwilligung', en: 'Draft consent' },
    revision: 'baf71f72-a196-47a5-9b22-da95791badc8:2',
    savedAt: '2026-09-17T15:00:00',
};

const commonHandlers = [
    http.get('*/service/users/data', () => HttpResponse.json({ id: USER_ID })),
    http.get('*/service/tenant/:id', () => HttpResponse.json(tenant)),
    http.get('*/service/tenantadmin/:id', () => HttpResponse.json(tenant)),
    http.get('*/service/agencyadmin/agencies/:id/legal-versions', () => HttpResponse.json([])),
];

const persistedHandlers = () => {
    let draft: AgencyLegalDraft | null = persistedDraft;
    return [
        ...commonHandlers,
        http.get(DRAFT_ENDPOINT, () => (draft ? HttpResponse.json(draft) : new HttpResponse(null, { status: 404 }))),
        http.put(DRAFT_ENDPOINT, async ({ request }) => {
            const body = (await request.json()) as Pick<AgencyLegalDraft, 'content' | 'consentText'> & {
                revision?: string;
            };
            draft = { ...persistedDraft, ...body, revision: `${persistedDraft.revision.split(':')[0]}:3` };
            return HttpResponse.json(draft);
        }),
        http.delete(DRAFT_ENDPOINT, () => {
            draft = null;
            return new HttpResponse(null, { status: 204 });
        }),
    ];
};

// Module-level so the story's beforeEach can reset it: the handlers are built once, and a rerun
// would otherwise start with a nonzero count and get the newer draft on its very first read.
let conflictReads = 0;
const conflictHandlers = () => {
    const newer = {
        ...persistedDraft,
        content: { de: '<h2>Neuere Server-Fassung</h2><p>Von einer anderen Administration.</p>' },
        consentText: {},
        revision: `${persistedDraft.revision.split(':')[0]}:3`,
        savedAt: '2026-09-17T15:20:00',
    };
    return [
        ...commonHandlers,
        http.get(DRAFT_ENDPOINT, async () => {
            conflictReads += 1;
            if (conflictReads > 1) await delay(600);
            return HttpResponse.json(conflictReads > 1 ? newer : persistedDraft);
        }),
        http.put(DRAFT_ENDPOINT, () => new HttpResponse(null, { status: 409 })),
    ];
};

const meta = {
    title: 'Organisms/Legal/AgencyLegalText/Server drafts',
    component: AgencyLegalTextContainer,
    parameters: { layout: 'padded' },
    decorators: [
        (Story, context) => {
            setStoryAuth([UserRole.AgencyAdmin], TENANT_ID);
            const key = legalDraftKey('privacy', `${TENANT_ID}:${USER_ID}:agency:${AGENCY_ID}`);
            if (key) {
                window.localStorage.removeItem(key);
                if (context.parameters.localDraft) {
                    window.localStorage.setItem(
                        key,
                        JSON.stringify({
                            content: { de: '<h2>Lokaler Alt-Entwurf</h2><p>Nur auf diesem Gerät gespeichert.</p>' },
                            consent: {},
                            savedAt: '2026-09-16T16:20:00+02:00',
                        }),
                    );
                }
            }
            return withAdminProviders(() => (
                <div style={{ minHeight: 760, padding: 16 }}>
                    <Story />
                </div>
            ));
        },
    ],
    args: {
        agencyData,
        field: 'privacy',
        onSaveAgencyWide: async () => undefined,
    },
} satisfies Meta<typeof AgencyLegalTextContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PersistedServerDraft: Story = {
    parameters: { msw: { handlers: persistedHandlers() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('Sie bearbeiten einen Server-Entwurf')).toBeVisible();
        await expect(canvas.getByText('Server-Entwurf der Beratungsstelle')).toBeVisible();
        await expect(canvas.getByRole('button', { name: 'Entwurf speichern' })).toBeVisible();
        await expect(canvas.getByRole('button', { name: 'Veröffentlichen' })).toBeVisible();
    },
};

export const LocalAndServerCollision: Story = {
    parameters: { localDraft: true, msw: { handlers: persistedHandlers() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('Zwei Entwürfe gefunden')).toBeVisible();
        await expect(canvas.queryByRole('button', { name: 'Entwurf speichern' })).not.toBeInTheDocument();
        await userEvent.click(canvas.getByRole('button', { name: 'Lokalen Entwurf verwenden' }));
        const localDraftContent = canvas.getAllByText('Lokaler Alt-Entwurf');
        await expect(localDraftContent[0]).toBeVisible();
        await expect(canvas.getByRole('button', { name: 'Entwurf speichern' })).toBeVisible();
    },
};

export const ConflictRefresh: Story = {
    beforeEach: () => {
        conflictReads = 0;
    },
    parameters: { msw: { handlers: conflictHandlers() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: 'Entwurf speichern' }));
        await expect(await canvas.findByText('Der Entwurf wurde zwischenzeitlich geändert')).toBeVisible();
        await expect(canvas.queryByRole('button', { name: 'Server-Entwurf laden' })).not.toBeInTheDocument();
        await waitFor(() => expect(canvas.getByRole('button', { name: 'Server-Entwurf laden' })).toBeVisible(), {
            timeout: 3000,
        });
        await expect(canvas.getByRole('button', { name: 'Eigene Fassung weiterbearbeiten' })).toBeVisible();
    },
};

const publishedWide: unknown[] = [];

/**
 * The agency draft store is not deployed (dev on 21.09.2026: GET and PUT answer 404).
 * Publishing saves first, so nothing goes live — and the admin is told exactly that,
 * in a message that stays until closed. The agency-wide text carries no "Entwurf" tag.
 */
export const PublishWithoutDraftStoreExplains: Story = {
    args: {
        onSaveAgencyWide: async () => {
            publishedWide.push('published');
        },
    },
    parameters: {
        msw: {
            handlers: [
                ...commonHandlers,
                http.get(DRAFT_ENDPOINT, () => new HttpResponse(null, { status: 404 })),
                http.put(DRAFT_ENDPOINT, () => new HttpResponse(null, { status: 404 })),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        publishedWide.length = 0;
        const canvas = within(canvasElement);
        const page = within(canvasElement.ownerDocument.body);
        await canvas.findByRole('button', { name: 'Veröffentlichen' }, { timeout: 8000 });
        await expect(canvas.queryByText('Entwurf', { selector: '.ant-tag' })).not.toBeInTheDocument();
        // The card re-keys once the user id has loaded; re-query instead of holding references.
        await waitFor(
            () => expect(canvasElement.querySelector('.ProseMirror[contenteditable="true"]')).not.toBeNull(),
            {
                timeout: 8000,
            },
        );
        await userEvent.click(canvasElement.querySelector('.ProseMirror[contenteditable="true"]') as HTMLElement);
        await userEvent.keyboard(' Geändert.');
        await userEvent.click(canvas.getByRole('button', { name: 'Veröffentlichen' }));
        const translate = await page.findByRole('dialog');
        await userEvent.click(within(translate).getByRole('button', { name: /Ohne Übersetzung veröffentlichen/ }));
        // The notice fades in; wait for the end of the animation, not just its first frame.
        await waitFor(() => expect(page.getByText(/Nicht veröffentlicht/)).toBeVisible(), { timeout: 8000 });
        await expect(publishedWide).toHaveLength(0);
    },
};

/** A restricted agency admin may only read: the card says the Träger maintains the text. */
export const RestrictedAgencyAdminReadsOnly: Story = {
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.RestrictedAgencyAdmin], TENANT_ID);
            return <Story />;
        },
    ],
    parameters: { msw: { handlers: persistedHandlers() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText(/Diesen Text pflegt Ihr Träger/, {}, { timeout: 8000 })).toBeVisible();
        await expect(canvas.queryByRole('button', { name: 'Veröffentlichen' })).not.toBeInTheDocument();
        await expect(canvas.queryByText(/Als Entwurf speichern/)).not.toBeInTheDocument();
    },
};
