import '@ant-design/v5-patch-for-react-19';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vite-plus/test';
import i18n from '../../../i18n';
import { clearSessionTokens, setSessionTokens } from '../../../api/auth/tokenSessionStore';
import { TENANT_DATA_KEY } from '../../../hooks/useTenantData.hook';
import { TopicSettingsPage } from '.';

vi.setConfig({ testTimeout: 60_000 });

/* The registration switch has its own gating (feature, permission, role); here it only has to be on the page. */
vi.mock('../../Topics/List/TopicRegistrationSwitch', () => ({
    TopicRegistrationSwitch: () => <div data-testid="registration-switch" />,
}));

const OWN_ICON = 'data:image/png;base64,iVBORw0KGgo=';

/** What the ConsultingTypeService answers on GET /topicadmin/catalogue (trimmed to three topics). */
const catalogue = {
    groups: [
        {
            id: 1,
            name: { de: 'Alter', en: 'Ageing, Older Adults' },
            icon: '/service/topic/public/icons/cat-02.png',
            topicIds: [15, 14],
        },
        {
            id: 5,
            name: { de: 'Migration', en: 'Migration & Integration' },
            icon: '/service/topic/public/icons/cat-03.png',
            topicIds: [20],
        },
    ],
    topics: [
        {
            id: 14,
            slug: 'debt',
            internalIdentifier: 'debt',
            status: 'ACTIVE',
            name: { de: 'Schulden', en: 'Debt' },
            description: { de: 'Hilfe bei Schulden', en: 'Help with debt' },
            icon: '/service/topic/public/icons/t-05-schulden.png',
            titles: { short: { de: 'Schulden' }, long: { de: 'Schulden' }, welcome: 'W', registrationDropdown: 'D' },
        },
        {
            id: 15,
            slug: 'life-in-old-age',
            internalIdentifier: 'life-in-old-age',
            status: 'ACTIVE',
            name: { de: 'Leben im Alter', en: 'Later Life Support' },
            description: { de: 'Alter', en: 'Later life' },
            icon: '/service/topic/public/icons/t-02-leben-im-alter.png',
            titles: { short: { de: 'Alter' }, long: { de: 'Alter' }, welcome: 'W', registrationDropdown: 'D' },
        },
        {
            id: 20,
            slug: 'migration',
            internalIdentifier: 'migration-support',
            status: 'INACTIVE',
            name: { de: 'Migration', en: 'Migration Support' },
            description: { de: 'Migration', en: 'Migration' },
            icon: OWN_ICON,
            titles: { short: { de: 'Migration' }, long: { de: 'Migration' }, welcome: 'W', registrationDropdown: 'D' },
        },
    ],
};

let savedCatalogue: unknown;
/** What the service holds: a save replaces it, so a reload shows what was saved. */
let stored: typeof catalogue = catalogue;

const server = setupServer(
    http.get('*/service/topicadmin/catalogue', () => HttpResponse.json(stored)),
    http.put('*/service/topicadmin/catalogue', async ({ request }) => {
        savedCatalogue = await request.json();
        stored = { ...stored, groups: (savedCatalogue as typeof catalogue).groups };
        return HttpResponse.json(stored);
    }),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => {
    server.resetHandlers();
    clearSessionTokens();
    savedCatalogue = undefined;
    stored = catalogue;
});

beforeEach(async () => {
    // The platform admin: agency-admin + tenant-admin on tenant 0, without the topic-admin role.
    setSessionTokens(
        `header.${btoa(
            JSON.stringify({ realm_access: { roles: ['agency-admin', 'tenant-admin'] }, tenantId: 0 }),
        )}.signature`,
        null,
    );
    await i18n.changeLanguage('de');
});

/** The platform tenant as the app already knows it; its active languages decide the editable ones. */
const showTab = (activeLanguages: string[] = ['de', 'en']) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    client.setQueryData([TENANT_DATA_KEY, 0], { id: 0, settings: { activeLanguages } });
    return render(
        <QueryClientProvider client={client}>
            <MemoryRouter>
                <TopicSettingsPage />
            </MemoryRouter>
        </QueryClientProvider>,
    );
};

const groupOrder = () =>
    Array.from(document.querySelectorAll('[data-group-id]')).map((group) => group.getAttribute('data-group-id'));

const groupItems = (groupId: string) =>
    Array.from(document.querySelectorAll(`[data-group-id="${groupId}"] li[data-topic-id]`)).map(
        (item) => item.textContent ?? '',
    );

it('shows the saved categories in their order, with their topics in order and their pictures', async () => {
    showTab();

    await waitFor(() => expect(groupItems('1')).toHaveLength(2));
    expect(groupItems('1')[0]).toContain('Leben im Alter');
    expect(groupItems('1')[1]).toContain('Schulden');
    expect(groupItems('5')[0]).toContain('Migration');
    expect(document.querySelector(`img[src="${OWN_ICON}"]`)).not.toBeNull();
});

it('shows one view: no dialog and no editing controls until "Bearbeiten"', async () => {
    showTab();
    const u = userEvent.setup({ delay: null });
    await waitFor(() => expect(groupItems('1')).toHaveLength(2));

    expect(screen.queryByRole('button', { name: 'Kategorie nach unten' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Neue Kategorie/ })).toBeNull();
    expect(document.querySelector('[draggable="true"]')).toBeNull();

    await u.click(screen.getByLabelText('Bearbeiten'));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Kategorie nach unten' }).length).toBeGreaterThan(0);
    expect(document.querySelector('[draggable="true"]')).not.toBeNull();

    await u.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(screen.queryByRole('button', { name: 'Kategorie nach unten' })).toBeNull();
    expect(screen.getByLabelText('Bearbeiten')).toBeInTheDocument();
});

it('edits in place and saves the whole catalogue through the catalogue endpoint', async () => {
    showTab();
    const u = userEvent.setup({ delay: null });
    await waitFor(() => expect(groupItems('1')).toHaveLength(2));

    await u.click(screen.getByLabelText('Bearbeiten'));
    await u.click(screen.getAllByRole('button', { name: 'Kategorie nach unten' })[0]);
    await u.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() => expect(savedCatalogue).toBeDefined());
    expect(savedCatalogue).toEqual({
        groups: [
            {
                id: 5,
                name: { de: 'Migration', en: 'Migration & Integration' },
                icon: '/service/topic/public/icons/cat-03.png',
                topicIds: [20],
            },
            {
                id: 1,
                name: { de: 'Alter', en: 'Ageing, Older Adults' },
                icon: '/service/topic/public/icons/cat-02.png',
                topicIds: [15, 14],
            },
        ],
        topics: [],
    });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Speichern' })).toBeNull());
    await waitFor(() => expect(groupOrder()).toEqual(['5', '1']));
});

it('keeps the edit open when saving fails', async () => {
    server.use(http.put('*/service/topicadmin/catalogue', () => new HttpResponse(null, { status: 500 })));
    showTab();
    const u = userEvent.setup({ delay: null });
    await waitFor(() => expect(groupItems('1')).toHaveLength(2));

    await u.click(screen.getByLabelText('Bearbeiten'));
    await u.click(screen.getAllByRole('button', { name: 'Kategorie nach unten' })[0]);
    await u.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('nicht gespeichert');
    expect(screen.getByRole('button', { name: 'Speichern' })).toBeEnabled();
    // The unsaved draft stays on screen.
    expect(groupOrder()).toEqual(['5', '1']);
});

it('shows a topic that is in no category, so it can still be switched on or off', async () => {
    stored = { ...catalogue, groups: [{ ...catalogue.groups[0] }] };
    showTab();

    await waitFor(() => expect(groupItems('without-category')).toHaveLength(1));
    expect(groupItems('without-category')[0]).toContain('Migration');
});

it('offers every active language for a first translation, even without any text in it yet', async () => {
    showTab(['de', 'en', 'fr']);
    const u = userEvent.setup({ delay: null });
    await waitFor(() => expect(groupItems('1')).toHaveLength(2));

    expect(screen.getByRole('button', { name: /Französisch/ })).toBeInTheDocument();
    await u.click(screen.getByLabelText('Bearbeiten'));
    expect(screen.getByRole('button', { name: /Französisch/ })).toBeInTheDocument();
});

it('keeps the switch for the topic step of the registration, since /admin/topics redirects here', async () => {
    showTab();

    expect(await screen.findByTestId('registration-switch')).toBeInTheDocument();
});

it('opens the editor only once a running visibility change and its reload are done', async () => {
    let finishPut: () => void = () => undefined;
    let catalogueReads = 0;
    server.use(
        http.get('*/service/topicadmin/catalogue', () => {
            catalogueReads += 1;
            return HttpResponse.json(stored);
        }),
        http.get('*/service/topicadmin/20', () => HttpResponse.json(catalogue.topics[2])),
        http.put(
            '*/service/topicadmin/20',
            () =>
                new Promise<Response>((resolve) => {
                    finishPut = () => {
                        stored = {
                            ...stored,
                            topics: stored.topics.map((topic) =>
                                topic.id === 20 ? { ...topic, status: 'ACTIVE' } : topic,
                            ),
                        };
                        resolve(HttpResponse.json({ ...catalogue.topics[2], status: 'ACTIVE' }));
                    };
                }),
        ),
    );
    showTab();
    const u = userEvent.setup({ delay: null });
    await waitFor(() => expect(groupItems('5')).toHaveLength(1));

    await u.click(screen.getByRole('switch', { name: /Migration/ }));
    expect(screen.getByLabelText('Bearbeiten')).toBeDisabled();

    const readsBefore = catalogueReads;
    finishPut();

    await waitFor(() => expect(screen.getByLabelText('Bearbeiten')).toBeEnabled());
    expect(catalogueReads).toBeGreaterThan(readsBefore);
    expect(screen.getByRole('switch', { name: /Migration/ })).toBeChecked();
    await u.click(screen.getByLabelText('Bearbeiten'));
    expect(screen.getByRole('button', { name: 'Speichern' })).toBeInTheDocument();
});

it('says the name is taken when the service rejects a rename with 409, and keeps the edit', async () => {
    server.use(http.put('*/service/topicadmin/catalogue', () => new HttpResponse(null, { status: 409 })));
    showTab();
    const u = userEvent.setup({ delay: null });
    await waitFor(() => expect(groupItems('1')).toHaveLength(2));

    await u.click(screen.getByLabelText('Bearbeiten'));
    await u.click(screen.getAllByRole('button', { name: 'Kategorie nach unten' })[0]);
    await u.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Diesen Namen hat schon ein anderes Thema');
    expect(screen.getByRole('button', { name: 'Speichern' })).toBeEnabled();
});
