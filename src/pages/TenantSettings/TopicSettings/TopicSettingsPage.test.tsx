import '@ant-design/v5-patch-for-react-19';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vite-plus/test';
import i18n from '../../../i18n';
import { clearSessionTokens, setSessionTokens } from '../../../api/auth/tokenSessionStore';
import { TopicSettingsPage } from '.';

vi.setConfig({ testTimeout: 60_000 });

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

const server = setupServer(
    http.get('*/service/topicadmin/catalogue', () => HttpResponse.json(catalogue)),
    http.put('*/service/topicadmin/catalogue', async ({ request }) => {
        savedCatalogue = await request.json();
        return HttpResponse.json(catalogue);
    }),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => {
    server.resetHandlers();
    clearSessionTokens();
    savedCatalogue = undefined;
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

const showTab = () =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <MemoryRouter>
                <TopicSettingsPage />
            </MemoryRouter>
        </QueryClientProvider>,
    );

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

it('edits in the dialog and saves the whole catalogue through the catalogue endpoint', async () => {
    showTab();
    const u = userEvent.setup({ delay: null });
    await waitFor(() => expect(groupItems('1')).toHaveLength(2));

    await u.click(screen.getByLabelText('Bearbeiten'));
    const dialog = await screen.findByRole('dialog');
    await u.click(within(dialog).getAllByRole('button', { name: 'Kategorie nach unten' })[0]);
    await u.click(within(dialog).getByRole('button', { name: 'Speichern' }));

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
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
