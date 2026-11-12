import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { AddonAuditLogsPage } from './index';
import { dayEnd, dayStart, visibleRoles } from './auditFilters';

const t = (key: string, options?: Record<string, unknown>) =>
    options && 'id' in options ? `${key}:${options.id}` : key;

const mocks = vi.hoisted(() => ({
    params: [] as any[],
    isSuperAdmin: false,
    language: 'en',
    error: null as Error | null,
    adminAddonsTenant: [] as Array<number | null>,
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t, i18n: { language: mocks.language, resolvedLanguage: mocks.language } }),
}));

vi.mock('../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({ isSuperAdmin: mocks.isSuperAdmin, tenantId: mocks.isSuperAdmin ? 0 : 7 }),
}));

vi.mock('../../../hooks/useTenantData.hook', () => ({
    useTenantData: () => ({ data: { id: 7, name: 'Caritas' } }),
}));

vi.mock('../../Addons/RemoteSearchSelect', () => ({
    TenantSelect: ({ ariaLabel, onChange }: any) => (
        <select
            aria-label={ariaLabel}
            onChange={(event) => onChange(event.target.value ? { id: 9, name: 'Diakonie' } : null)}
        >
            <option value="" />
            <option value="9">Diakonie</option>
        </select>
    ),
}));

vi.mock('antd', async (importOriginal) => ({
    ...(await importOriginal<typeof import('antd')>()),
    Select: ({ 'aria-label': label, value, onChange, options }: any) => (
        <select aria-label={label} value={value ?? ''} onChange={(event) => onChange(event.target.value || undefined)}>
            <option value="" />
            {options.map((option: any) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    ),
}));

vi.mock('../../../components/DataTable', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../components/DataTable')>()),
    DataTablePagination: ({ onPageChange, onPageSizeChange }: any) => (
        <>
            <button type="button" onClick={() => onPageChange(3)}>
                go-to-page-3
            </button>
            <button type="button" onClick={() => onPageSizeChange(30)}>
                change-page-size
            </button>
        </>
    ),
}));

const entries = [
    {
        id: 'a1',
        createdAt: '2026-11-12T08:30:00Z',
        addon: 'digisucht-tools',
        appId: 'goals',
        action: 'tool.released',
        summary: { de: 'Tool freigegeben', en: 'Released tool' },
        actor: { id: 'u-1', username: 'berater.mueller', roles: ['consultant', 'offline_access', 'default-roles-x'] },
        tenantId: 7,
        agencyId: 42,
        sessionId: 1234,
        subjectId: 'asker-9',
    },
    {
        id: 'a2',
        createdAt: '2026-11-11T08:30:00Z',
        addon: 'digisucht-tools',
        appId: null,
        action: 'settings.changed',
        summary: { de: 'Nur deutsch' },
        actor: { id: 'u-2', username: null, roles: [] },
        tenantId: 7,
        agencyId: null,
        sessionId: null,
        subjectId: null,
    },
];

vi.mock('../../Addons/useAddons', () => ({
    useAddonAuditEntries: (params: unknown) => {
        mocks.params.push(params);
        return mocks.error
            ? { data: undefined, isLoading: false, isError: true, error: mocks.error }
            : { data: { items: entries, page: 0, size: 20, total: 2 }, isLoading: false, isError: false, error: null };
    },
    useAddonRegistry: () => ({
        data: {
            addons: [
                { name: 'digisucht-tools', apps: [{ id: 'goals', title: { de: 'Ziele', en: 'Goals' }, slots: [] }] },
            ],
        },
    }),
    useAdminAddons: (tenantId: number | null) => {
        mocks.adminAddonsTenant.push(tenantId);
        return { data: [{ manifest: { name: 'calendar-addon' } }] };
    },
    useAgencyNames: (ids: number[]) =>
        Object.fromEntries(ids.map((id) => [id, id === 42 ? 'Suchtberatung Mitte' : null])),
}));

const last = () => mocks.params[mocks.params.length - 1];

const atWidth = (width: number) =>
    vi.stubGlobal(
        'ResizeObserver',
        class {
            constructor(private callback: ResizeObserverCallback) {}

            observe(target: Element) {
                this.callback(
                    [{ target, contentRect: { width } } as ResizeObserverEntry],
                    this as unknown as ResizeObserver,
                );
            }

            // eslint-disable-next-line class-methods-use-this
            disconnect() {}
        },
    );

describe('AddonAuditLogsPage', () => {
    beforeEach(() => {
        mocks.params.length = 0;
        mocks.adminAddonsTenant.length = 0;
        mocks.isSuperAdmin = false;
        mocks.language = 'en';
        mocks.error = null;
        atWidth(1400);
    });
    afterEach(() => vi.unstubAllGlobals());

    it('shows time, add-on and app, action, summary, actor, Träger and agency, and subject', () => {
        render(<AddonAuditLogsPage />);

        expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
            'addonAudit.table.createdAt',
            'addonAudit.table.addon',
            'addonAudit.table.action',
            'addonAudit.table.summary',
            'addonAudit.table.actor',
            'addonAudit.table.scope',
            'addonAudit.table.subject',
        ]);
        const row = screen.getAllByRole('row')[1];
        expect(within(row).getByText('Goals')).toBeInTheDocument();
        expect(within(row).getByText('tool.released')).toBeInTheDocument();
        expect(within(row).getByText('Released tool')).toBeInTheDocument();
        expect(within(row).getByText('berater.mueller')).toBeInTheDocument();
        expect(within(row).getByText('addonAudit.role.consultant')).toBeInTheDocument();
        expect(within(row).getByText('Caritas')).toBeInTheDocument();
        expect(within(row).getByText('Suchtberatung Mitte')).toBeInTheDocument();
        expect(within(row).getByText('asker-9')).toBeInTheDocument();
        expect(within(row).getByText('addonAudit.session:1234')).toBeInTheDocument();
    });

    it('shows the summary in the admin language and falls back to German', () => {
        mocks.language = 'de';
        const { unmount } = render(<AddonAuditLogsPage />);
        expect(screen.getByText('Tool freigegeben')).toBeInTheDocument();
        unmount();

        mocks.language = 'en';
        render(<AddonAuditLogsPage />);
        expect(screen.getByText('Nur deutsch')).toBeInTheDocument();
    });

    it('asks for the first page with the contract page numbering and no Träger for a Träger admin', () => {
        render(<AddonAuditLogsPage />);

        expect(last()).toEqual({ tenantId: null, addon: undefined, from: undefined, to: undefined, page: 0, size: 20 });
        expect(screen.queryByLabelText('addonAudit.filters.tenant')).not.toBeInTheDocument();
        expect(mocks.adminAddonsTenant).toContain(7);
    });

    it('offers every known add-on as filter and returns to the first page', () => {
        render(<AddonAuditLogsPage />);
        fireEvent.click(screen.getByText('go-to-page-3'));
        expect(last().page).toBe(2);

        const select = screen.getByLabelText('addonAudit.filters.addon');
        expect(
            within(select)
                .getAllByRole('option')
                .map((option) => option.textContent),
        ).toEqual(['', 'calendar-addon', 'digisucht-tools']);
        fireEvent.change(select, { target: { value: 'digisucht-tools' } });
        expect(last()).toMatchObject({ addon: 'digisucht-tools', page: 0 });
    });

    it('filters by a date range from the start of the first to the end of the last day', () => {
        render(<AddonAuditLogsPage />);

        fireEvent.change(screen.getByLabelText('addonAudit.filters.from'), { target: { value: '2026-11-01' } });
        fireEvent.change(screen.getByLabelText('addonAudit.filters.to'), { target: { value: '2026-11-12' } });
        expect(last()).toMatchObject({ from: dayStart('2026-11-01'), to: dayEnd('2026-11-12'), page: 0 });

        fireEvent.click(screen.getByRole('button', { name: 'addonAudit.filters.reset' }));
        expect(last()).toMatchObject({ from: undefined, to: undefined, addon: undefined, page: 0 });
    });

    it('lets a SuperAdmin narrow the log to one Träger', () => {
        mocks.isSuperAdmin = true;
        render(<AddonAuditLogsPage />);
        expect(last().tenantId).toBeNull();

        fireEvent.change(screen.getByLabelText('addonAudit.filters.tenant'), { target: { value: '9' } });
        expect(last()).toMatchObject({ tenantId: 9, page: 0 });
        expect(mocks.adminAddonsTenant).toContain(9);
    });

    it('changes the page size and restarts at the first page', () => {
        render(<AddonAuditLogsPage />);
        fireEvent.click(screen.getByText('go-to-page-3'));
        fireEvent.click(screen.getByText('change-page-size'));

        expect(last()).toMatchObject({ page: 0, size: 30 });
    });

    it('tells missing permission and a missing endpoint apart from other failures', () => {
        mocks.error = new Error('FORBIDDEN');
        const { unmount } = render(<AddonAuditLogsPage />);
        expect(screen.getByRole('alert')).toHaveTextContent('addonAudit.error.forbidden');
        expect(screen.queryByTestId('admin-empty')).not.toBeInTheDocument();
        unmount();

        mocks.error = new Error('NO_MATCH');
        const second = render(<AddonAuditLogsPage />);
        expect(screen.getByRole('alert')).toHaveTextContent('addonAudit.error.unavailable');
        second.unmount();

        mocks.error = new Error('boom');
        render(<AddonAuditLogsPage />);
        expect(screen.getByRole('alert')).toHaveTextContent('addonAudit.error.load');
    });

    it('folds action and subject into other cells on narrower containers and shows cards on phones', () => {
        atWidth(1000);
        const { unmount } = render(<AddonAuditLogsPage />);
        expect(screen.getByTestId('addon-audit-log')).toHaveAttribute('data-layout', 'tablet');
        expect(screen.getAllByRole('columnheader')).toHaveLength(5);
        const row = screen.getAllByRole('row')[1];
        expect(within(row).getByText('tool.released')).toBeInTheDocument();
        expect(within(row).getByText('asker-9')).toBeInTheDocument();
        unmount();

        atWidth(400);
        render(<AddonAuditLogsPage />);
        expect(screen.getByTestId('addon-audit-log')).toHaveAttribute('data-layout', 'phone');
        expect(within(screen.getAllByRole('row')[1]).getByText('addonAudit.table.actor')).toBeInTheDocument();
    });
});

describe('visibleRoles', () => {
    it('drops the Keycloak default roles', () => {
        expect(visibleRoles(['default-roles-online-beratung', 'offline_access', 'uma_authorization', 'user'])).toEqual([
            'user',
        ]);
        expect(visibleRoles(null)).toEqual([]);
    });
});
