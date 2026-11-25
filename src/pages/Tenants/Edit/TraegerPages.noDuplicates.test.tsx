import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vite-plus/test';
import i18n from '../../../i18n';

/**
 * ORISO-Admin#1577: a setting lives in one place. What belongs to a conversation type (and Team-Chat
 * and supervision) sits in Funktionszugriff; "Weitere" (formerly Funktionalitäten) keeps only topics
 * and counsellor statistics. The two Träger tabs must never offer the same setting. The API is mocked
 * at the request boundary (`fetchData`).
 */

type Request = { url: string; method: string };

vi.mock('../../../api/fetchData', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../api/fetchData')>();
    const routes: Array<[string, () => unknown]> = [
        ['/service/tenantadmin/7/permission-policies', () => ({ tenantId: 7, policies: {} })],
        [
            '/service/tenantadmin/7',
            () => ({
                id: 7,
                name: 'Träger Süd',
                legalName: 'Caritasverband Süd e.V.',
                licensing: { allowedNumberOfUsers: 40 },
                settings: {},
            }),
        ],
        ['/case-handover/reason-policies', () => []],
        ['/service/useradmin/invitelinks/topics', () => []],
        ['/service/useradmin/invitelinks', () => ({ content: [], totalElements: 0 })],
    ];
    return {
        ...actual,
        fetchData: vi.fn(async (request: Request) => {
            const path = request.url.split('?')[0];
            const route = routes.find(([suffix]) => path.endsWith(suffix));
            if (request.method !== 'GET' || !route) throw new Error(`Unmocked ${request.method} ${request.url}`);
            return route[1]();
        }),
    };
});

// eslint-disable-next-line import/first
import { TenantGlobalSettings } from './GlobalSettings';
// eslint-disable-next-line import/first
import { OtherFunctionsSettings } from '../../../components/Tenants/AppSettings/OtherFunctionsSettings';
// eslint-disable-next-line import/first
import { FunctionalitiesGrid } from '../../../components/Tenants/AppSettings/FunctionalitiesGrid';
// eslint-disable-next-line import/first
import { TenantInformationCard } from './General/TenantInformationCard';

const renderAt = (path: string, element: JSX.Element) =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <MemoryRouter initialEntries={[path]}>
                <Routes>
                    <Route path="/admin/tenants/:id/:tab" element={element} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );

beforeAll(async () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
    await i18n.changeLanguage('en');
});

describe('Träger tabs Funktionszugriff and Weitere (ORISO-Admin#1577)', () => {
    it('never offer the same setting', async () => {
        const access = renderAt('/admin/tenants/7/global-settings', <TenantGlobalSettings />);
        await waitFor(() =>
            expect(access.container.querySelector('[data-testid="chat-type-card-liveChat"]')).not.toBeNull(),
        );
        const accessSettings = new Set(
            [...access.container.querySelectorAll<HTMLElement>('[data-feature-policy]')].map(
                (element) => element.dataset.featurePolicy as string,
            ),
        );
        access.unmount();

        const functionalities = renderAt('/admin/tenants/7/functionalities', <OtherFunctionsSettings tenantId="7" />);
        await waitFor(() => expect(functionalities.container.querySelector('[role="switch"]')).not.toBeNull());
        // antd labels a field after its path: settings_featureTopicsEnabled, settings_extendedSettings_…
        const functionalitySettings = [...functionalities.container.querySelectorAll<HTMLLabelElement>('label[for]')]
            .map((label) => label.htmlFor.split('_').at(-1) as string)
            .filter(Boolean);

        expect(accessSettings.size).toBeGreaterThan(20);
        expect(functionalitySettings.sort()).toEqual(['featureStatisticsEnabled', 'featureTopicsEnabled']);
        ['featureSupervisionEnabled', 'featureTeamDiscussionEnabled', 'featureSupervisionOneOnOneChatsEnabled'].forEach(
            (setting) => expect(accessSettings).toContain(setting),
        );
        expect(functionalitySettings.filter((setting) => accessSettings.has(setting))).toEqual([]);
    });
});

/** The form fields a rendered page offers, by their antd path (`licensing_allowedNumberOfUsers`, `legalName`). */
const fieldNames = (container: HTMLElement) =>
    [...container.querySelectorAll<HTMLInputElement>('input[id], textarea[id]')].map((input) => input.id);

describe('Träger tabs Stammdaten and Weitere (Frank, 2026-11-20)', () => {
    it('offer licence and sender in "Weitere" only', async () => {
        const masterData = render(
            <TenantInformationCard
                form={undefined as never}
                initialValues={{ name: 'Träger Süd' }}
                isLoading={false}
                shouldShowSubdomainField
                requiredRule={{ required: true }}
                onSave={vi.fn()}
            />,
        );
        const masterDataFields = fieldNames(masterData.container);
        masterData.unmount();

        const more = renderAt(
            '/admin/tenants/7/functionalities',
            <FunctionalitiesGrid tenantId="7" withLicenceAndSender />,
        );
        await waitFor(() => expect(more.container.querySelector('#legalName')).not.toBeNull());
        const moreFields = fieldNames(more.container);

        expect(masterDataFields).toContain('name');
        expect(masterDataFields).toContain('address');
        const moved = ['licensing_allowedNumberOfUsers', 'legalName', 'contactEmail', 'contactPhone'];
        moved.forEach((field) => {
            expect(moreFields).toContain(field);
            expect(masterDataFields).not.toContain(field);
        });
        expect(moreFields.filter((field) => masterDataFields.includes(field))).toEqual([]);
    });
});
