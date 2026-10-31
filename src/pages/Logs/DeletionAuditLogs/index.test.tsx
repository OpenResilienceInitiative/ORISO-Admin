import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { DeletionAuditLogsPage } from './index';

const t = (key: string) => key;

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t, i18n: { language: 'de' } }),
}));

vi.mock('../../../components/GlobalSearch', () => ({
    GlobalSearchBar: ({ ariaLabel, value, onSearchChange, onSearch }: any) => (
        <input
            aria-label={ariaLabel}
            value={value}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && onSearch(event.currentTarget.value)}
        />
    ),
}));

// Native selects stand in for antd's, so a test can drive onChange without opening a popup.
vi.mock('antd', async (importOriginal) => ({
    ...(await importOriginal<typeof import('antd')>()),
    Select: ({ 'aria-label': label, value, onChange, options }: any) => (
        <select aria-label={label} value={value ?? ''} onChange={(event) => onChange(event.target.value || undefined)}>
            <option value="" />
            {options.map((option: any) => (
                <option key={option.value} value={option.value}>
                    {option.value}
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

const mocks = vi.hoisted(() => ({ isError: false, params: [] as any[] }));

vi.mock('../../../hooks/useDeletionAuditLogsData', () => ({
    useDeletionAuditLogsData: (params: unknown) => {
        mocks.params.push(params);
        // A failed request has no data, exactly as react-query reports it.
        return {
            data: mocks.isError
                ? undefined
                : {
                      data: [
                          {
                              id: 1,
                              actorId: 'admin-1',
                              actorRole: 'PLATFORM_ADMIN',
                              targetType: 'CONSULTANT',
                              targetId: 'consultant-9',
                              tenantId: 4,
                              outcome: 'SCHEDULED',
                              createDate: '2026-10-01T10:00:00Z',
                          },
                          {
                              id: 2,
                              actorId: null,
                              actorRole: 'SYSTEM',
                              targetType: 'CONSULTANT',
                              targetId: 'consultant-9',
                              tenantId: 4,
                              outcome: 'EXECUTED',
                              createDate: '2026-10-03T10:00:00Z',
                          },
                      ],
                      total: 2,
                      page: 1,
                      perPage: 20,
                  },
            isLoading: false,
            isError: mocks.isError,
        };
    },
}));

describe('DeletionAuditLogsPage', () => {
    beforeEach(() => {
        mocks.isError = false;
        mocks.params.length = 0;
    });

    it('shows when, who (id and role), what, target id and outcome', () => {
        render(<DeletionAuditLogsPage />);

        expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
            'deletionAudit.table.createdAt',
            'deletionAudit.table.outcome',
            'deletionAudit.table.targetType',
            'deletionAudit.table.targetId',
            'deletionAudit.table.tenantId',
            'deletionAudit.table.actorRole',
            'deletionAudit.table.actorId',
        ]);
        expect(screen.getAllByText('consultant-9')).toHaveLength(2);
        expect(screen.getByText('admin-1')).toBeInTheDocument();
        expect(screen.getByText('deletionAudit.outcome.SCHEDULED')).toBeInTheDocument();
        expect(screen.getByText('deletionAudit.outcome.EXECUTED')).toBeInTheDocument();
    });

    it('names the scheduler as actor role and shows no id for it', () => {
        render(<DeletionAuditLogsPage />);

        expect(screen.getByText('deletionAudit.actor.SYSTEM')).toBeInTheDocument();
        expect(screen.getByText('-')).toBeInTheDocument();
    });

    describe('by container width', () => {
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
        afterEach(() => vi.unstubAllGlobals());

        it('folds type into target and role into actor before it switches to cards', () => {
            atWidth(1000);
            render(<DeletionAuditLogsPage />);

            expect(screen.getByTestId('deletion-log')).toHaveAttribute('data-layout', 'combined');
            expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
                'deletionAudit.table.createdAt',
                'deletionAudit.table.outcome',
                'deletionAudit.table.target',
                'deletionAudit.table.tenantId',
                'deletionAudit.table.actor',
            ]);
            const row = screen.getAllByRole('row')[1];
            expect(within(row).getByText('consultant-9')).toBeInTheDocument();
            expect(within(row).getByText('admin-1')).toBeInTheDocument();
        });

        it('shows every value of a row, with its label, in cards', () => {
            atWidth(400);
            render(<DeletionAuditLogsPage />);

            expect(screen.getByTestId('deletion-log')).toHaveAttribute('data-layout', 'cards');
            const row = screen.getAllByRole('row')[1];
            expect(within(row).getByText('deletionAudit.table.target')).toBeInTheDocument();
            expect(within(row).getByText('deletionAudit.table.actor')).toBeInTheDocument();
            expect(within(row).getByText('consultant-9')).toBeInTheDocument();
            expect(within(row).getByText('admin-1')).toBeInTheDocument();
            expect(within(row).getByText('deletionAudit.outcome.SCHEDULED')).toBeInTheDocument();
        });
    });

    it('surfaces a backend failure instead of an empty table', () => {
        mocks.isError = true;
        render(<DeletionAuditLogsPage />);

        expect(screen.getByText('error.loading')).toBeInTheDocument();
        // "No data" next to an error would read as "nothing was deleted".
        expect(screen.queryByTestId('admin-empty')).not.toBeInTheDocument();
    });

    describe('data hook params', () => {
        const last = () => mocks.params[mocks.params.length - 1];

        it('filters by target type and outcome and returns to page 1', () => {
            render(<DeletionAuditLogsPage />);
            fireEvent.click(screen.getByText('go-to-page-3'));
            expect(last().page).toBe(3);

            fireEvent.change(screen.getByLabelText('deletionAudit.filters.targetType'), {
                target: { value: 'AGENCY' },
            });
            expect(last()).toMatchObject({ targetType: 'AGENCY', page: 1 });

            fireEvent.click(screen.getByText('go-to-page-3'));
            fireEvent.change(screen.getByLabelText('deletionAudit.filters.outcome'), {
                target: { value: 'CANCELLED' },
            });
            expect(last()).toMatchObject({ targetType: 'AGENCY', outcome: 'CANCELLED', page: 1 });
        });

        it('queries the target id only when the search is submitted', () => {
            render(<DeletionAuditLogsPage />);
            const search = screen.getByLabelText('deletionAudit.filters.targetId');
            fireEvent.change(search, { target: { value: 'consultant-9' } });
            expect(last().targetId).toBe('');

            fireEvent.keyDown(search, { key: 'Enter' });
            expect(last()).toMatchObject({ targetId: 'consultant-9', page: 1 });
        });

        it('changes page and page size, restarting at page 1 for a new size', () => {
            render(<DeletionAuditLogsPage />);
            fireEvent.click(screen.getByText('go-to-page-3'));
            expect(last()).toMatchObject({ page: 3, perPage: 20 });

            fireEvent.click(screen.getByText('change-page-size'));
            expect(last()).toMatchObject({ page: 1, perPage: 30 });
        });

        it('resets every filter', () => {
            render(<DeletionAuditLogsPage />);
            fireEvent.change(screen.getByLabelText('deletionAudit.filters.targetType'), {
                target: { value: 'AGENCY' },
            });
            fireEvent.change(screen.getByLabelText('deletionAudit.filters.outcome'), {
                target: { value: 'CANCELLED' },
            });
            const search = screen.getByLabelText('deletionAudit.filters.targetId');
            fireEvent.change(search, { target: { value: 'consultant-9' } });
            fireEvent.keyDown(search, { key: 'Enter' });
            fireEvent.click(screen.getByText('go-to-page-3'));

            fireEvent.click(screen.getByRole('button', { name: 'deletionAudit.filters.reset' }));
            expect(last()).toMatchObject({ page: 1, targetType: undefined, outcome: undefined, targetId: '' });
            expect(search).toHaveValue('');
        });
    });

    it('starts unfiltered on page 1', () => {
        render(<DeletionAuditLogsPage />);

        expect(mocks.params[0]).toMatchObject({ page: 1, perPage: 20, targetType: undefined, outcome: undefined });
    });
});
