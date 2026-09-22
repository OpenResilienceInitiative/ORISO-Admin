import type { Meta, StoryObj } from '@storybook/react-vite';
import { delay, http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath resolves in Storybook/Vite
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { UserRole } from '../../../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../../../utils/storybook/adminStoryDecorators';
import { legalDraftKey } from '../../utils/legalDraftStorage';
import type { TenantLegalDraft } from '../../../../../api/tenant/legalDrafts';
import { LegalText } from './index';

const TENANT_ID = 7;
const USER_ID = 'storybook-tenant-admin';
const DRAFT_ENDPOINT = '*/service/tenantadmin/:id/legal-drafts/IMPRINT';

const publishedContent = {
    de: '<h2>Veröffentlichtes Impressum</h2><p>Diese Fassung ist derzeit öffentlich sichtbar.</p>',
    en: '<h2>Published imprint</h2><p>This version is currently public.</p>',
};

const tenant = {
    id: TENANT_ID,
    name: 'Träger Nordlicht',
    adminEmails: [],
    settings: { activeLanguages: ['de', 'en'] },
    theming: { logo: '', favicon: '', primaryColor: '#9e1b50', secondaryColor: '#ffffff' },
    content: {
        impressum: publishedContent,
        privacy: {},
        termsAndConditions: {},
        claim: {},
        confirmTermsAndConditions: false,
        confirmPrivacy: false,
    },
};

const persistedDraft: TenantLegalDraft = {
    kind: 'IMPRINT',
    content: {
        de: '<h2>Entwurf: Impressum</h2><p>Diese Änderungen sind gespeichert, aber noch nicht veröffentlicht.</p>',
        en: '<h2>Draft: imprint</h2><p>These changes are saved but not published yet.</p>',
    },
    revision: '41:3',
    updatedAt: '2026-09-17T10:15:00+02:00',
};

const commonHandlers = [
    http.get('*/service/users/data', () => HttpResponse.json({ id: USER_ID })),
    http.get('*/service/tenant/public/*', () => HttpResponse.json({ id: TENANT_ID, settings: {} })),
    http.get('*/service/tenant/:id', () => HttpResponse.json(tenant)),
    http.get('*/service/tenantadmin/:id', () => HttpResponse.json(tenant)),
    http.get('*/service/tenantadmin/:id/legal-versions', () => HttpResponse.json([])),
    http.put('*/service/tenantadmin/:id', async ({ request }) => HttpResponse.json(await request.json())),
];

const persistedHandlers = () => {
    let draft: TenantLegalDraft | null = persistedDraft;
    return [
        ...commonHandlers,
        http.get(DRAFT_ENDPOINT, () => (draft ? HttpResponse.json(draft) : new HttpResponse(null, { status: 404 }))),
        http.put(DRAFT_ENDPOINT, async ({ request }) => {
            const body = (await request.json()) as Pick<TenantLegalDraft, 'content' | 'revision'>;
            draft = { ...persistedDraft, ...body, revision: '41:4', updatedAt: '2026-09-17T10:30:00+02:00' };
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
    const newerDraft: TenantLegalDraft = {
        ...persistedDraft,
        content: {
            de: '<h2>Neuere Server-Fassung</h2><p>Eine andere Administration hat diesen Entwurf gespeichert.</p>',
            en: '<h2>Newer server version</h2><p>Another administrator saved this draft.</p>',
        },
        revision: '41:4',
        updatedAt: '2026-09-17T10:45:00+02:00',
    };
    return [
        ...commonHandlers,
        http.get(DRAFT_ENDPOINT, async () => {
            reads += 1;
            if (reads > 1) await delay(800);
            return HttpResponse.json(reads > 1 ? newerDraft : persistedDraft);
        }),
        http.put(DRAFT_ENDPOINT, () => new HttpResponse(null, { status: 409 })),
    ];
};

const meta = {
    title: 'Organisms/Legal/LegalText/Server drafts',
    component: LegalText,
    parameters: { layout: 'padded' },
    decorators: [
        (Story, context) => {
            setStoryAuth([UserRole.TenantAdmin], TENANT_ID);
            const key = legalDraftKey('imprint', `${TENANT_ID}:${USER_ID}`);
            if (key) {
                window.localStorage.removeItem(key);
                if (context.parameters.localDraft) {
                    window.localStorage.setItem(
                        key,
                        JSON.stringify({
                            content: {
                                de: '<h2>Lokaler Browser-Entwurf</h2><p>Diese Fassung wurde vor der Server-Migration gespeichert.</p>',
                                en: '<h2>Local browser draft</h2><p>This version predates the server migration.</p>',
                            },
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
        tenantId: TENANT_ID,
        fieldName: ['content', 'impressum'],
        titleKey: 'imprint.title',
        legalType: 'imprint',
        placeHolderKey: 'settings.imprint.placeholder',
    },
} satisfies Meta<typeof LegalText>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A persisted server draft is clearly separate from the currently published imprint. */
export const PersistedServerDraft: Story = {
    parameters: { msw: { handlers: persistedHandlers() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('Sie bearbeiten einen Server-Entwurf')).toBeVisible();
        const notice = canvas.getByTestId('tenant-server-draft-notice');
        await expect(notice).toHaveClass('ant-alert-info');
        await expect(notice).toHaveAttribute('role', 'status');
        await expect(getComputedStyle(notice).backgroundColor).toBe('rgb(234, 231, 232)');

        // 390px viewport minus Storybook's two 16px gutters. This caught the
        // card's former fixed 375px minimum width before visual review did.
        const storyCanvas = canvasElement;
        const originalWidth = storyCanvas.style.width;
        storyCanvas.style.width = '358px';
        await waitFor(() => {
            expect(notice.getBoundingClientRect().right).toBeLessThanOrEqual(
                storyCanvas.getBoundingClientRect().right + 0.5,
            );
        });
        storyCanvas.style.width = originalWidth;

        await expect(canvas.getByRole('button', { name: 'Entwurf speichern' })).toBeVisible();
        await expect(canvas.getByRole('button', { name: 'Veröffentlichen' })).toBeVisible();
        await expect(canvas.queryByRole('button', { name: /teilen|share/i })).not.toBeInTheDocument();
    },
};

/** Both copies remain recoverable until the admin explicitly chooses which one to continue. */
export const LocalAndServerCollision: Story = {
    parameters: { localDraft: true, msw: { handlers: persistedHandlers() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('Zwei Entwürfe gefunden')).toBeVisible();
        await expect(canvas.queryByRole('button', { name: 'Entwurf speichern' })).not.toBeInTheDocument();
        await userEvent.click(canvas.getByRole('button', { name: 'Lokalen Entwurf verwenden' }));
        await expect(canvas.getByRole('button', { name: 'Entwurf speichern' })).toBeVisible();
        await expect(canvas.getByRole('button', { name: 'Veröffentlichen' })).toBeVisible();
    },
};

/** A 409 blocks both mutations while the current server revision is fetched, then offers an explicit choice. */
export const ConflictRefresh: Story = {
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
        await expect(canvas.queryByRole('button', { name: 'Entwurf speichern' })).not.toBeInTheDocument();
    },
};
