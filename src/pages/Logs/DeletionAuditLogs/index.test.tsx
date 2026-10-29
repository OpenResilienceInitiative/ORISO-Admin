import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeletionAuditLogsPage } from './index';

const t = (key: string) => key;

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t }),
}));

vi.mock('../../../components/GlobalSearch', () => ({
    GlobalSearchBar: ({ ariaLabel }: { ariaLabel: string }) => <input aria-label={ariaLabel} />,
}));

vi.mock('../../../components/ListingTable', () => ({
    ListingTable: ({ columns = [], dataSource = [] }: any) => (
        <div data-testid="listing-table">
            <div data-testid="columns">{columns.map((column: any) => String(column.title)).join('|')}</div>
            {dataSource.map((row: any, rowIndex: number) => (
                <div key={row.id} data-testid="log-row">
                    {columns.map((column: any, columnIndex: number) => {
                        const value = column.dataIndex ? row[column.dataIndex] : undefined;
                        const cell = column.render ? column.render(value, row, rowIndex) : value;
                        return <div key={column.key ?? columnIndex}>{cell}</div>;
                    })}
                </div>
            ))}
        </div>
    ),
}));

const mocks = vi.hoisted(() => ({ isError: false, params: [] as any[] }));

vi.mock('../../../hooks/useDeletionAuditLogsData', () => ({
    useDeletionAuditLogsData: (params: unknown) => {
        mocks.params.push(params);
        return {
            data: {
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

        expect(screen.getByTestId('columns').textContent).toBe(
            [
                'deletionAudit.table.createdAt',
                'deletionAudit.table.outcome',
                'deletionAudit.table.targetType',
                'deletionAudit.table.targetId',
                'deletionAudit.table.tenantId',
                'deletionAudit.table.actorRole',
                'deletionAudit.table.actorId',
            ].join('|'),
        );
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

    it('surfaces a backend failure instead of an empty table', () => {
        mocks.isError = true;
        render(<DeletionAuditLogsPage />);

        expect(screen.getByText('error.loading')).toBeInTheDocument();
    });

    it('starts unfiltered on page 1', () => {
        render(<DeletionAuditLogsPage />);

        expect(mocks.params[0]).toMatchObject({ page: 1, perPage: 20, targetType: undefined, outcome: undefined });
    });
});
