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
        const body = within(canvasElement.ownerDocument.body);
        await waitFor(async () =>
            expect(
                await body.findByText(/noch nicht veröffentlicht\. Online bleibt bis dahin die bisherige Fassung\./),
            ).toBeVisible(),
        );
        // The saved-draft state is a pop-up on the shared channel, not a box above the card: it
        // says when the draft was saved and that the previous version stays live, is
        // announced politely, and offers exactly one action — Discard.
        const notice = await body.findByTestId('snackbar');
        // Announced politely: the pop-up sits in the host's polite live region.
        await expect(notice.closest('[role="status"]')).not.toBeNull();
        await expect(notice).toHaveTextContent(/Entwurf vom .+ noch nicht veröffentlicht/);
        await waitFor(() => expect(within(notice).getByRole('button', { name: 'Verwerfen' })).toBeVisible());
        await waitFor(() => expect(within(notice).getByRole('button', { name: 'Meldung schließen' })).toBeVisible());
        await expect(canvas.queryByText('Sie bearbeiten einen Server-Entwurf')).not.toBeInTheDocument();

        // 390px viewport minus Storybook's two 16px gutters. This caught the
        // card's former fixed 375px minimum width before visual review did.
        const storyCanvas = canvasElement;
        const originalWidth = storyCanvas.style.width;
        storyCanvas.style.width = '358px';
        await waitFor(() => {
            expect(storyCanvas.scrollWidth).toBeLessThanOrEqual(storyCanvas.clientWidth + 0.5);
        });
        storyCanvas.style.width = originalWidth;

        // The loaded draft IS the saved one: nothing to save, but it differs from the
        // live text, so publishing is offered.
        await expect(canvas.queryByRole('button', { name: 'Speichern' })).not.toBeInTheDocument();
        await expect(canvas.getByRole('button', { name: 'Veröffentlichen' })).toBeVisible();
        await expect(canvas.queryByRole('button', { name: /teilen|share/i })).not.toBeInTheDocument();
    },
};

/** Both copies remain recoverable until the admin explicitly chooses which one to continue. */
export const LocalAndServerCollision: Story = {
    parameters: { localDraft: true, msw: { handlers: persistedHandlers() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        await waitFor(async () => expect(await body.findByText('Zwei Entwürfe gefunden')).toBeVisible());
        await expect(canvas.queryByRole('button', { name: 'Speichern' })).not.toBeInTheDocument();
        await userEvent.click(body.getByRole('button', { name: 'Entwurf aus diesem Browser verwenden' }));
        await expect(canvas.getByRole('button', { name: 'Speichern' })).toBeVisible();
        await expect(canvas.getByRole('button', { name: 'Veröffentlichen' })).toBeVisible();
    },
};

/** A 409 blocks both mutations while the current server revision is fetched, then offers an explicit choice. */
export const ConflictRefresh: Story = {
    parameters: { msw: { handlers: conflictHandlers() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        // "Speichern" appears once there is something to save.
        await canvas.findByRole('button', { name: 'Veröffentlichen' }, { timeout: 8000 });
        await userEvent.click(await canvas.findByRole('button', { name: /Bearbeiten|Speichern/ }));
        await userEvent.click(canvasElement.querySelector('.ProseMirror') as HTMLElement);
        await userEvent.keyboard(' Geändert.');
        await userEvent.click(await canvas.findByRole('button', { name: 'Speichern' }));
        await waitFor(async () =>
            expect(await body.findByText('Der Entwurf wurde zwischenzeitlich geändert')).toBeVisible(),
        );
        await expect(body.queryByRole('button', { name: 'Gespeicherte Fassung laden' })).not.toBeInTheDocument();
        await waitFor(() => expect(body.getByRole('button', { name: 'Gespeicherte Fassung laden' })).toBeVisible(), {
            timeout: 3000,
        });
        await expect(body.getByRole('button', { name: 'Eigene Fassung weiterbearbeiten' })).toBeVisible();
        await expect(canvas.queryByRole('button', { name: 'Speichern' })).not.toBeInTheDocument();
    },
};

/**
 * The saved-draft state is a pop-up (the event); the permanent help is plain tile text with a
 * "Nicht mehr anzeigen" link, never a second pop-up. Closing the draft pop-up keeps the state out of
 * the way and does not touch the help text or the draft.
 */
export const DraftPopupWithHelpText: Story = {
    // The story dismisses the tip for good, so a rerun in the same browser needs a clean slate.
    beforeEach: () => {
        Object.keys(window.localStorage)
            .filter((key) => key.startsWith('oriso-admin.legal.'))
            .forEach((key) => window.localStorage.removeItem(key));
    },
    parameters: { msw: { handlers: persistedHandlers() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        const draftPopup = await body.findByTestId('snackbar');
        // Exactly one pop-up for a normal load: the help is not raised on the channel.
        await expect(body.getAllByTestId('snackbar')).toHaveLength(1);
        const helpAction = canvas.getByRole('button', { name: 'Nicht mehr anzeigen' });
        await expect(helpAction).toBeVisible();
        await expect(canvas.queryByRole('region', { name: 'Hinweise zum Editor' })).not.toBeInTheDocument();

        await userEvent.click(within(draftPopup).getByRole('button', { name: 'Meldung schließen' }));

        await waitFor(() => expect(body.queryAllByTestId('snackbar')).toHaveLength(0));
        await expect(helpAction).toBeVisible();
        await expect(canvas.getByRole('button', { name: 'Veröffentlichen' })).toBeVisible();
        await userEvent.click(canvas.getByRole('button', { name: 'Bearbeiten' }));
        await expect(canvas.getByRole('textbox')).toHaveTextContent('Entwurf: Impressum');

        await userEvent.click(helpAction);
        await waitFor(() =>
            expect(canvas.queryByRole('button', { name: 'Nicht mehr anzeigen' })).not.toBeInTheDocument(),
        );
        await expect(canvas.getByRole('textbox')).toHaveTextContent('Entwurf: Impressum');
    },
};

/**
 * Two drafts: the decision is a pop-up with two actions; closing it keeps the open decision as plain
 * text in the tile, and its button raises the pop-up again. Nothing is lost by closing.
 */
export const CollisionPopupClosedKeepsQuietLine: Story = {
    parameters: { localDraft: true, msw: { handlers: persistedHandlers() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        const popup = await body.findByTestId('tenant-draft-source-choice');
        // The quiet line is there from the start; the re-open button only once the pop-up was closed.
        const quiet = await canvas.findByTestId('tenant-draft-status');
        await expect(quiet).toHaveTextContent('Zwei Entwürfe gefunden, Entscheidung offen.');
        await expect(canvas.queryByRole('button', { name: 'Entscheidung öffnen' })).not.toBeInTheDocument();

        await userEvent.click(within(popup).getByRole('button', { name: 'Meldung schließen' }));
        await waitFor(() => expect(body.queryByTestId('tenant-draft-source-choice')).not.toBeInTheDocument());
        await expect(canvas.queryByRole('button', { name: 'Speichern' })).not.toBeInTheDocument();

        await userEvent.click(await canvas.findByRole('button', { name: 'Entscheidung öffnen' }));
        const again = await body.findByTestId('tenant-draft-source-choice');
        // The pop-up fades in; wait until it is fully there.
        await waitFor(() =>
            expect(within(again).getByRole('button', { name: 'Entwurf aus diesem Browser verwenden' })).toBeVisible(),
        );
        await expect(canvas.queryByRole('button', { name: 'Entscheidung öffnen' })).not.toBeInTheDocument();

        // Deciding ends the state: pop-up and quiet line go together.
        await userEvent.click(within(again).getByRole('button', { name: 'Entwurf aus diesem Browser verwenden' }));
        await waitFor(() => expect(canvas.queryByTestId('tenant-draft-status')).not.toBeInTheDocument());
    },
};

// Outage flag: every read fails until the play flips it (a remount must not use up the failure).
let draftStoreDown = true;
let unavailableReads = 0;
const unavailableHandlers = () => [
    ...commonHandlers,
    http.get(DRAFT_ENDPOINT, () => {
        unavailableReads += 1;
        if (draftStoreDown) return new HttpResponse(null, { status: 500 });
        return HttpResponse.json(persistedDraft);
    }),
    http.put(DRAFT_ENDPOINT, () => new HttpResponse(null, { status: 500 })),
];

/**
 * The saved draft cannot be loaded (L3): an error pop-up with "Erneut laden" and a quiet line in the
 * tile. Retry refetches the draft; once it arrives the error and its line are gone.
 */
export const ServerDraftUnavailable: Story = {
    beforeEach: () => {
        unavailableReads = 0;
        draftStoreDown = true;
    },
    parameters: { msw: { handlers: unavailableHandlers() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        const popup = await body.findByTestId('tenant-draft-unavailable');
        await expect(popup).toHaveTextContent('Der gespeicherte Entwurf konnte nicht geladen werden');
        await expect(popup).toHaveAttribute('data-severity', 'error');
        await expect(await canvas.findByTestId('tenant-draft-status')).toHaveTextContent(
            'Der gespeicherte Entwurf konnte nicht geladen werden',
        );
        const readsBeforeRetry = unavailableReads;
        await expect(readsBeforeRetry).toBeGreaterThan(0);
        draftStoreDown = false;

        await userEvent.click(within(popup).getByRole('button', { name: 'Erneut laden' }));

        await waitFor(() => expect(unavailableReads).toBeGreaterThan(readsBeforeRetry));
        await waitFor(() => expect(body.queryByTestId('tenant-draft-unavailable')).not.toBeInTheDocument());
        await waitFor(() => expect(canvas.queryByTestId('tenant-draft-status')).not.toBeInTheDocument());
        await waitFor(async () =>
            expect(await body.findByText(/noch nicht veröffentlicht\. Online bleibt bis dahin/)).toBeVisible(),
        );
    },
};
