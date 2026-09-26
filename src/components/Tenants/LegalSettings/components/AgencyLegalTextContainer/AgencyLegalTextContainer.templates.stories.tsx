import type { Meta, StoryObj } from '@storybook/react-vite';
import { ReactNode, useEffect, useState } from 'react';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath resolves in Storybook/Vite
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { UserRole } from '../../../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../../../utils/storybook/adminStoryDecorators';
import { useAppConfigContext } from '../../../../../context/useAppConfig';
import type { AgencyLegalProposal } from '../../../../../api/agency/legalProposals';
import { AgencyLegalTextWithTemplates } from './AgencyLegalTextWithTemplates';

/**
 * #1070 — a Beratungsstelle receives the privacy policy its Träger forwarded: the same
 * left/right compare as one rung up, plus how many Fachbereiche follow the agency text.
 * Real container and hooks, mocked HTTP (API note 1070-api.md, section 3.3).
 */

const AGENCY_ID = 101;
const TENANT_ID = 7;
const USER_ID = 'storybook-agency-admin';
const BASE = `*/service/agencyadmin/agencies/${AGENCY_ID}`;

const agencyData = {
    id: AGENCY_ID,
    tenantId: TENANT_ID,
    name: 'Beratungsstelle Nordlicht Mitte',
    topics: [
        { id: 3, name: 'Schuldnerberatung' },
        { id: 4, name: 'Schwangerschaftsberatung' },
    ],
    departments: [
        { topicId: 3, hasPublishedDpp: false },
        { topicId: 4, hasPublishedDpp: true },
    ],
    content: {},
} as any;

const tenant = {
    id: TENANT_ID,
    name: 'Träger Nordlicht',
    settings: { activeLanguages: ['de'] },
    content: {
        privacy: {
            de: '<h2>Datenschutzerklärung des Trägers</h2><p>Gilt, bis die Beratungsstelle eine eigene veröffentlicht.</p>',
        },
    },
};

const offer: AgencyLegalProposal = {
    id: 5001,
    recipientAgencyId: AGENCY_ID,
    kind: 'DPP',
    content: {
        de:
            '<h2>Datenschutzerklärung (Fassung des Trägers)</h2>' +
            '<h3>1. Verantwortliche Stelle</h3><p>Beratungsstelle [Name], [Anschrift].</p>' +
            '<h3>2. Datenschutzbeauftragte</h3><p>[Name], erreichbar unter [E-Mail].</p>' +
            '<h3>3. Zwecke der Verarbeitung</h3><p>Wir verarbeiten Ihre Angaben ausschließlich zur Beratung.</p>',
    },
    consentText: { de: 'Ich habe die {{legal_links}} gelesen.' },
    status: 'PENDING',
    revision: '5001:0',
    source: 'DRAFT',
    sourceRevision: '12:3',
    distributionId: '7c3e',
    audience: 'SELECTED',
    createdBy: 'traeger-admin',
    createdAt: '2026-09-25T14:31:07',
    departmentImpact: { affected: 1, notAffected: 1, notAffectedTopicIds: [4] },
};

const adopted: unknown[] = [];

const handlers = [
    http.get('*/service/users/data', () => HttpResponse.json({ id: USER_ID })),
    http.get('*/service/tenant/:id', () => HttpResponse.json(tenant)),
    http.get('*/service/tenantadmin/:id', () => HttpResponse.json(tenant)),
    http.get(`${BASE}/legal-versions`, () => HttpResponse.json([])),
    http.get(`${BASE}/topics/:topicId/legal-versions`, () => HttpResponse.json([])),
    http.get(`${BASE}/topics/:topicId/dpp`, () => HttpResponse.json({ content: null, publicationStatus: 'DRAFT' })),
    http.get(`${BASE}/legal-drafts/DPP`, () => new HttpResponse(null, { status: 404 })),
    http.get(`${BASE}/legal-proposals`, () => HttpResponse.json([offer])),
    http.post(`${BASE}/legal-proposals/:proposalId/adopt`, async ({ request }) => {
        adopted.push(await request.json());
        return HttpResponse.json({
            draft: {
                kind: 'DPP',
                content: offer.content,
                consentText: offer.consentText,
                revision: '8c65:1',
                savedAt: '2026-09-25T15:00:00',
                originProposalId: offer.id,
            },
            proposal: { ...offer, status: 'ADOPTED' },
            departmentImpact: offer.departmentImpact,
        });
    }),
    http.post(`${BASE}/legal-proposals/:proposalId/dismiss`, () =>
        HttpResponse.json({ ...offer, status: 'DISMISSED' }),
    ),
    http.get(`${BASE}/legal-draft-archives`, () => HttpResponse.json([])),
];

/** The platform-wide switch "Einstellungen Rechtstexte" turned off. */
const LockedPlatform = ({ children }: { children: ReactNode }): ReactNode => {
    const { setManualSettings } = useAppConfigContext();
    const [ready, setReady] = useState(false);
    useEffect(() => {
        setManualSettings({
            multitenancyWithSingleDomainEnabled: true,
            legalContentChangesBySingleTenantAdminsAllowed: false,
        });
        setReady(true);
    }, [setManualSettings]);
    return ready ? children : null;
};

const meta = {
    title: 'Organisms/Legal/AgencyLegalText/Received template (Beratungsstelle)',
    component: AgencyLegalTextWithTemplates,
    parameters: { layout: 'fullscreen', msw: { handlers } },
    decorators: [
        (Story) => {
            adopted.length = 0;
            return withAdminProviders(() => (
                <div style={{ minHeight: 900, padding: 16 }}>
                    <Story />
                </div>
            ));
        },
    ],
    args: { agencyData, field: 'privacy', onSaveAgencyWide: async () => undefined },
} satisfies Meta<typeof AgencyLegalTextWithTemplates>;

export default meta;
type Story = StoryObj<typeof meta>;

const LOAD = { timeout: 10000 };

/** The Träger forwarded its privacy policy: template left, own card right, Fachbereich impact named. */
export const AgencyWithNewTemplate: Story = {
    beforeEach: () => setStoryAuth([UserRole.AgencyAdmin], TENANT_ID),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const region = await canvas.findByRole(
            'region',
            { name: /Vorlage Ihres Trägers · Datenschutzerklärung/ },
            LOAD,
        );
        await expect(within(region).getByText(/folgt ihm 1 Fachbereich/)).toBeVisible();
        const adopt = within(region).getByRole('button', { name: 'Vorlage übernehmen' });
        await waitFor(() => expect(adopt).toBeEnabled(), LOAD);
    },
};

/** Adopting into the empty agency draft: the agency-wide text now holds the Träger wording. */
export const AgencyAdoptsTemplate: Story = {
    beforeEach: () => setStoryAuth([UserRole.AgencyAdmin], TENANT_ID),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const page = within(canvasElement.ownerDocument.body);
        const adopt = await canvas.findByRole('button', { name: 'Vorlage übernehmen' }, LOAD);
        await waitFor(() => expect(adopt).toBeEnabled(), LOAD);
        await userEvent.click(adopt);
        await waitFor(() => expect(adopted).toEqual([{ mode: 'CREATE_IF_EMPTY', expectedProposalRevision: '5001:0' }]));
        await expect(await page.findByText(/Veröffentlicht ist noch nichts/, {}, LOAD)).toBeInTheDocument();
    },
};

/** Platform lock: the template is still readable, the lock reason is named, adopting is off. */
export const AgencyReadOnlyUnderPlatformLock: Story = {
    beforeEach: () => setStoryAuth([UserRole.AgencyAdmin], TENANT_ID),
    decorators: [
        (Story) => (
            <LockedPlatform>
                <Story />
            </LockedPlatform>
        ),
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const region = await canvas.findByRole(
            'region',
            { name: /Vorlage Ihres Trägers · Datenschutzerklärung/ },
            LOAD,
        );
        await expect(within(region).getByRole('note')).toHaveTextContent(/plattformweit gesperrt/);
        await expect(within(region).getByRole('button', { name: 'Vorlage übernehmen' })).toBeDisabled();
        await expect(within(region).getByRole('button', { name: 'Verwerfen' })).toBeDisabled();
    },
};

/** Phone 390: template on top, collapsible, the agency card below. */
export const AgencyMobile390: Story = {
    globals: { viewport: { value: 'phone', isRotated: false } },
    beforeEach: () => setStoryAuth([UserRole.AgencyAdmin], TENANT_ID),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByRole('button', { name: 'Vorlage einklappen' }, LOAD)).toBeVisible();
    },
};
