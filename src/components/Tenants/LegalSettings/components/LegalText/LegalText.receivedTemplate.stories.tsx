import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath resolves in Storybook/Vite
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { UserRole } from '../../../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../../../utils/storybook/adminStoryDecorators';
import type { TenantLegalDraft } from '../../../../../api/tenant/legalDrafts';
import type { DistributeAgencyLegalProposal, TenantLegalProposal } from '../../../../../api/tenant/legalProposals';
import { TraegerLegalText } from './TraegerLegalText';

/**
 * #1070 — a Träger receives the platform's imprint template: marker, left/right compare
 * (template read-only on the left, own draft on the right), adopt / dismiss, and forwarding its
 * own draft to its Beratungsstellen. Real card and hooks, mocked HTTP (API note 1070-api.md).
 */

const TRAEGER_ID = 7;
const USER_ID = 'storybook-traeger-admin';
const BASE = `*/service/tenantadmin/${TRAEGER_ID}`;

const traeger = {
    id: TRAEGER_ID,
    name: 'Träger Nordlicht',
    adminEmails: [],
    settings: { activeLanguages: ['de', 'en'] },
    theming: { logo: '', favicon: '', primaryColor: '#9e1b50', secondaryColor: '#ffffff' },
    content: {
        impressum: {
            de: '<h2>Impressum</h2><p>Träger Nordlicht e. V., Hafenstraße 4, 24103 Kiel.</p>',
        },
        privacy: {},
        termsAndConditions: {},
        claim: {},
        confirmTermsAndConditions: false,
        confirmPrivacy: false,
    },
};

const template: TenantLegalProposal = {
    id: 31,
    recipientTenantId: TRAEGER_ID,
    kind: 'IMPRINT',
    content: {
        de:
            '<h2>Muster-Impressum für Träger</h2><p>Angaben gemäß § 5 DDG.</p>' +
            '<h3>Vertreten durch</h3><p>Den Vorstand: [Name], [Name].</p>' +
            '<h3>Kontakt</h3><p>Telefon: [Nummer]<br>E-Mail: [Adresse]</p>' +
            '<h3>Registereintrag</h3><p>Eintragung im Vereinsregister. Registergericht: [Ort]. Registernummer: [VR …].</p>',
        en: '<h2>Template imprint for Träger</h2><p>Information according to § 5 DDG.</p>',
    },
    status: 'PENDING',
    revision: '31:0',
    sourceRevision: '9:2',
    sourceUpdatedAt: '2026-09-25T12:00:00',
    distributionId: '7c3e0000-0000-0000-0000-000000000031',
    audience: 'ALL',
    createdBy: 'platform-admin',
    // Zoneless UTC on the wire: shown as 16:31 (Berlin).
    createdAt: '2026-09-25T14:31:07',
};

const ownDraft: TenantLegalDraft = {
    kind: 'IMPRINT',
    content: {
        de: '<h2>Impressum</h2><p>Träger Nordlicht e. V., Hafenstraße 4, 24103 Kiel.</p><p>Überarbeitung läuft.</p>',
    },
    revision: '41:3',
    updatedAt: '2026-09-24T09:00:00',
};

const agencies = [
    { id: 101, name: 'Beratungsstelle Nordlicht Mitte' },
    { id: 102, name: 'Beratungsstelle Nordlicht Süd' },
    { id: 103, name: 'Beratungsstelle Nordlicht Ost' },
];

/** What the play functions assert on. */
const calls = { adopt: [] as unknown[], dismiss: [] as unknown[], forward: [] as DistributeAgencyLegalProposal[] };

const handlers = ({ proposals = [template], draft = null as TenantLegalDraft | null } = {}) => {
    let currentDraft = draft;
    let currentProposals = proposals;
    return [
        http.get('*/service/users/data', () => HttpResponse.json({ id: USER_ID })),
        http.get('*/service/tenant/public/*', () => HttpResponse.json({ id: TRAEGER_ID, settings: {} })),
        http.get('*/service/tenant/:id', () => HttpResponse.json(traeger)),
        http.get(`${BASE}/legal-versions`, () =>
            HttpResponse.json([
                {
                    id: 42,
                    kind: 'IMPRINT',
                    ownerLevel: 'TENANT',
                    ownerId: TRAEGER_ID,
                    content: JSON.stringify(traeger.content.impressum),
                    publishedAt: '2026-09-01T08:00:00',
                },
            ]),
        ),
        http.get(`${BASE}/legal-drafts/IMPRINT`, () =>
            currentDraft ? HttpResponse.json(currentDraft) : new HttpResponse(null, { status: 404 }),
        ),
        http.put(`${BASE}/legal-drafts/IMPRINT`, async ({ request }) => {
            const body = (await request.json()) as Pick<TenantLegalDraft, 'content'>;
            currentDraft = { ...ownDraft, content: body.content, revision: '41:4' };
            return HttpResponse.json(currentDraft);
        }),
        http.get(`${BASE}/legal-proposals`, () => HttpResponse.json(currentProposals)),
        http.post(`${BASE}/legal-proposals/:proposalId/dismiss`, async ({ request }) => {
            calls.dismiss.push(await request.json());
            currentProposals = currentProposals.map((p) => ({ ...p, status: 'DISMISSED' as const }));
            return HttpResponse.json(currentProposals[0]);
        }),
        http.post(`${BASE}/legal-proposals/:proposalId/adopt`, async ({ request }) => {
            calls.adopt.push(await request.json());
            currentProposals = currentProposals.map((p) => ({ ...p, status: 'ADOPTED' as const }));
            currentDraft = {
                kind: 'IMPRINT',
                content: template.content,
                revision: '41:9',
                updatedAt: '2026-09-25T15:00:00',
            };
            return HttpResponse.json(currentDraft);
        }),
        http.get(`${BASE}/legal-draft-archives`, () => HttpResponse.json([])),
        http.get(`${BASE}`, () => HttpResponse.json(traeger)),
        http.get('*/service/agencyadmin/agencies', () =>
            HttpResponse.json({ _embedded: agencies.map((agency) => ({ _embedded: agency })), total: agencies.length }),
        ),
        http.get('*/service/agencyadmin/legal-proposal-distributions', () => HttpResponse.json([])),
        http.post('*/service/agencyadmin/legal-proposal-distributions', async ({ request }) => {
            const body = (await request.json()) as DistributeAgencyLegalProposal;
            calls.forward.push(body);
            const recipientAgencyIds = body.audience === 'ALL' ? agencies.map((a) => a.id) : body.agencyIds ?? [];
            return HttpResponse.json(
                { distributionId: 'd-9', requestKey: body.requestKey, recipientAgencyIds, proposals: [] },
                { status: 201 },
            );
        }),
    ];
};

const meta = {
    title: 'Organisms/Legal/LegalText/Received template (Träger)',
    component: TraegerLegalText,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.TenantAdmin, UserRole.AgencyAdmin], TRAEGER_ID);
            calls.adopt.length = 0;
            calls.dismiss.length = 0;
            calls.forward.length = 0;
            return withAdminProviders(() => (
                <div style={{ minHeight: 900, padding: 16 }}>
                    <Story />
                </div>
            ));
        },
    ],
    args: {
        tenantId: TRAEGER_ID,
        fieldName: ['content', 'impressum'],
        titleKey: 'imprint.title',
        legalType: 'imprint',
        placeHolderKey: 'settings.imprint.placeholder',
    },
} satisfies Meta<typeof TraegerLegalText>;

export default meta;
type Story = StoryObj<typeof meta>;

const LOAD = { timeout: 10000 };

/** The platform sent an imprint template: marker, source and Berlin send time, template left, draft right. */
export const TraegerWithNewTemplate: Story = {
    parameters: { msw: { handlers: handlers() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const region = await canvas.findByRole('region', { name: /Vorlage des Plattformbetreibers · Impressum/ }, LOAD);
        await expect(within(region).getByText('Neue Vorlage')).toBeVisible();
        await expect(within(region).getByText(/25\.09\.2026, 16:31/)).toBeVisible();
        await expect(within(region).getByRole('button', { name: 'Vorlage übernehmen' })).toBeEnabled();
    },
};

/** Adopting into an empty draft: the editor shows the template, nothing is published. */
export const TraegerAdoptsIntoEmptyDraft: Story = {
    parameters: { msw: { handlers: handlers() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const page = within(canvasElement.ownerDocument.body);
        const adopt = await canvas.findByRole('button', { name: 'Vorlage übernehmen' }, LOAD);
        await waitFor(() => expect(adopt).toBeEnabled(), LOAD);
        await userEvent.click(adopt);
        await waitFor(() =>
            expect(calls.adopt).toEqual([{ mode: 'CREATE_IF_EMPTY', expectedProposalRevision: '31:0' }]),
        );
        await expect(await page.findByText(/Veröffentlicht ist noch nichts/, {}, LOAD)).toBeInTheDocument();
    },
};

/** Over an own draft: the confirmation names where the replaced draft stays readable. */
export const TraegerReplaceConfirmation: Story = {
    parameters: { msw: { handlers: handlers({ draft: ownDraft }) } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const page = within(canvasElement.ownerDocument.body);
        const adopt = await canvas.findByRole('button', { name: 'Vorlage übernehmen' }, LOAD);
        await waitFor(() => expect(adopt).toBeEnabled(), LOAD);
        await userEvent.click(adopt);
        const dialog = await page.findByRole('dialog');
        await waitFor(() => expect(within(dialog).getByText(/„Ersetzte Entwürfe“/)).toBeVisible());
    },
};

/** "An Beratungsstellen weiterreichen": selected Beratungsstellen, dialog open before sending. */
export const TraegerForwardDialog: Story = {
    parameters: { msw: { handlers: handlers({ proposals: [], draft: ownDraft }) } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const page = within(canvasElement.ownerDocument.body);
        const forward = { name: /An Beratungsstellen weiterreichen/ };
        await waitFor(() => expect(canvas.getByRole('button', forward)).toBeEnabled(), LOAD);
        await userEvent.click(canvas.getByRole('button', forward));
        const dialog = await page.findByRole('dialog');
        await waitFor(() =>
            expect(within(dialog).getByText('Impressum an Beratungsstellen weiterreichen')).toBeVisible(),
        );
        await userEvent.click(within(dialog).getByLabelText('Ausgewählte Beratungsstellen'));
        await userEvent.click(await within(dialog).findByText('Beratungsstelle Nordlicht Süd'));
        await userEvent.click(await within(dialog).findByText('Beratungsstelle Nordlicht Ost'));
        await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Weiterreichen' })).toBeEnabled());
    },
};

/** Forwarding to all: the answer says how many Beratungsstellen received it. */
export const TraegerForwardResult: Story = {
    parameters: { msw: { handlers: handlers({ proposals: [], draft: ownDraft }) } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const page = within(canvasElement.ownerDocument.body);
        const forward = { name: /An Beratungsstellen weiterreichen/ };
        await waitFor(() => expect(canvas.getByRole('button', forward)).toBeEnabled(), LOAD);
        await userEvent.click(canvas.getByRole('button', forward));
        const dialog = await page.findByRole('dialog');
        await userEvent.click(within(dialog).getByRole('button', { name: 'Weiterreichen' }));
        await waitFor(() => expect(calls.forward).toHaveLength(1));
        await expect(calls.forward[0]).toMatchObject({
            kind: 'IMPRINT',
            source: 'DRAFT',
            sourceRevision: '41:3',
            audience: 'ALL',
        });
        await expect(await page.findByText('Vorlage an 3 Beratungsstellen weitergereicht.')).toBeInTheDocument();
    },
};

/** Phone 390: template on top (collapsible), own draft below. */
export const TraegerMobile390: Story = {
    globals: { viewport: { value: 'phone', isRotated: false } },
    parameters: { msw: { handlers: handlers({ draft: ownDraft }) } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByRole('button', { name: 'Vorlage einklappen' }, LOAD)).toBeVisible();
    },
};
