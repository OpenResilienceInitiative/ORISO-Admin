import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { fetchData } from '../../../../api/fetchData';
import { getSingleTenantData } from '../../../../api/tenant/getSingleTenantData';
import type { TenantAdminData } from '../../../../types/TenantAdminData';
import { ErstantwortSettings } from './index';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../api/fetchData', () => ({ fetchData: vi.fn(), FETCH_METHODS: { PUT: 'PUT' } }));
vi.mock('../../../../api/tenant/getSingleTenantData', () => ({ getSingleTenantData: vi.fn() }));
vi.mock('../../../FormPluginEditor/M3RichTextEditor', () => ({
    M3RichTextEditor: ({
        title,
        value,
        onChange,
    }: {
        title: string;
        value?: string;
        onChange?: (text: string) => void;
    }) => (
        <label htmlFor={`editor-${title}`}>
            {title}
            <textarea aria-label={title} value={value ?? ''} onChange={(event) => onChange?.(event.target.value)} />
        </label>
    ),
}));
vi.mock('antd', async () => {
    const actual = await vi.importActual<typeof import('antd')>('antd');
    return { ...actual, notification: { success: vi.fn(), error: vi.fn() } };
});

afterEach(cleanup);

it('keeps tenant B query cache and draft when the real mutation hook completes tenant A save', async () => {
    const tenant = (id: number): TenantAdminData => ({
        id,
        name: `Synthetic tenant ${id}`,
        isSuperAdmin: false,
        userRoles: [],
        adminEmails: [],
        settings: { activeLanguages: ['de'], extendedSettings: { languageFormal: true } },
        theming: { logo: '', favicon: '', primaryColor: '#000000', secondaryColor: '#ffffff' },
        content: {
            impressum: {},
            privacy: {},
            termsAndConditions: {},
            claim: {},
            confirmTermsAndConditions: false,
            confirmPrivacy: false,
            erstantwortGreeting: { de: `<p>Stored tenant ${id}</p>` },
            erstantwortWhoReadsAlong: { de: '<p>Our counselling team</p>' },
        },
    });
    vi.mocked(getSingleTenantData).mockImplementation(async (id) => tenant(Number(id)));
    let finishSave!: (value: object) => void;
    vi.mocked(fetchData).mockImplementation(
        () =>
            new Promise((resolve) => {
                finishSave = resolve;
            }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const settings = (id: string) => (
        <QueryClientProvider client={client}>
            <ErstantwortSettings tenantId={id} />
        </QueryClientProvider>
    );
    const view = render(settings('7'));
    const greeting = () => screen.getByLabelText('tenants.erstantwort.greeting.label');
    await waitFor(() => expect(greeting()).toHaveValue('<p>Stored tenant 7</p>'));
    fireEvent.change(greeting(), { target: { value: '<p>Tenant A change</p>' } });
    fireEvent.click(screen.getByRole('button', { name: 'tenants.erstantwort.publish' }));
    await waitFor(() => expect(fetchData).toHaveBeenCalledTimes(1));
    view.rerender(settings('8'));
    await waitFor(() => expect(greeting()).toHaveValue('<p>Stored tenant 8</p>'));
    fireEvent.change(greeting(), { target: { value: '<p>Tenant B unsaved draft</p>' } });
    await act(async () => {
        finishSave({});
    });
    expect(client.getQueryData<TenantAdminData>(['TENANT', 8])?.content?.erstantwortGreeting).toEqual({
        de: '<p>Stored tenant 8</p>',
    });
    expect(greeting()).toHaveValue('<p>Tenant B unsaved draft</p>');
    expect(client.getQueryData<TenantAdminData>(['TENANT', 7])?.content?.erstantwortGreeting).toEqual({
        de: '<p>Tenant A change</p>',
    });
});
