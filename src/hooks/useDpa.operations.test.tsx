import { useState } from 'react';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import '../i18n';
import { useDpaVersions } from './useDpaVersions.hook';
import { usePublishDpa } from './usePublishDpa.hook';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const PublicationView = () => {
    const [tenant, setTenant] = useState(21);
    const versions = useDpaVersions(tenant);
    const publication = usePublishDpa(tenant);
    return (
        <>
            <div>{versions.data?.[0]?.content}</div>
            <button type="button" onClick={() => setTenant(tenant === 21 ? 22 : 21)}>
                Switch tenant
            </button>
            <button
                type="button"
                onClick={() =>
                    publication.mutate({
                        contentByLanguage: { de: 'New A' },
                        signingDeadlineAt: '2099-10-30T15:00:00Z',
                    })
                }
            >
                Publish
            </button>
        </>
    );
};

it('refreshes the publication owner when its request completes after leaving that tenant', async () => {
    let finishPublication!: () => void;
    let published = false;
    const pending = new Promise<void>((resolve) => {
        finishPublication = resolve;
    });
    server.use(
        http.get('*/service/tenantadmin/21/dpa/versions', () =>
            HttpResponse.json([{ activationDate: '2026-10-01T10:00', content: published ? 'New A' : 'Old A' }]),
        ),
        http.get('*/service/tenantadmin/22/dpa/versions', () =>
            HttpResponse.json([{ activationDate: '2026-10-01T10:00', content: 'Contract B' }]),
        ),
        http.put('*/service/tenantadmin/21/dpa/v2', async () => {
            await pending;
            published = true;
            return HttpResponse.json({ dpaPublished: true, dpaSigned: false });
        }),
    );
    render(
        <QueryClientProvider
            client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}
        >
            <PublicationView />
        </QueryClientProvider>,
    );
    const user = userEvent.setup();
    await screen.findByText('Old A');
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    await user.click(screen.getByRole('button', { name: 'Switch tenant' }));
    await screen.findByText('Contract B');
    finishPublication();
    await waitFor(() => expect(published).toBe(true));
    await user.click(screen.getByRole('button', { name: 'Switch tenant' }));
    expect(await screen.findByText('New A')).toBeVisible();
});
