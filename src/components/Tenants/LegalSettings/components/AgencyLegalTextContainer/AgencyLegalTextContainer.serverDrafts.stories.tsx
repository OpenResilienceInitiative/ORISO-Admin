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

const conflictHandlers = () => {
    let reads = 0;
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
            reads += 1;
            if (reads > 1) await delay(600);
            return HttpResponse.json(reads > 1 ? newer : persistedDraft);
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
        await expect(
            await canvas.findByText(/noch nicht veröffentlicht\. Online bleibt bis dahin die bisherige Fassung\./),
        ).toBeVisible();
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
        await userEvent.click(canvas.getByRole('button', { name: 'Entwurf aus diesem Browser verwenden' }));
        const localDraftContent = canvas.getAllByText('Lokaler Alt-Entwurf');
        await expect(localDraftContent[0]).toBeVisible();
        await expect(canvas.getByRole('button', { name: 'Entwurf speichern' })).toBeVisible();
    },
};

export const ConflictRefresh: Story = {
    parameters: { msw: { handlers: conflictHandlers() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: 'Entwurf speichern' }));
        await expect(await canvas.findByText('Der Entwurf wurde zwischenzeitlich geändert')).toBeVisible();
        await expect(canvas.queryByRole('button', { name: 'Gespeicherte Fassung laden' })).not.toBeInTheDocument();
        await waitFor(() => expect(canvas.getByRole('button', { name: 'Gespeicherte Fassung laden' })).toBeVisible(), {
            timeout: 3000,
        });
        await expect(canvas.getByRole('button', { name: 'Eigene Fassung weiterbearbeiten' })).toBeVisible();
    },
};
