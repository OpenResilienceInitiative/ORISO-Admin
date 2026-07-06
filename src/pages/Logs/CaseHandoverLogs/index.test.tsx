import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CaseHandoverLogsPage } from './index';

const t = (key: string) => key;

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t }),
}));

vi.mock('../../../components/Page', () => {
    const Page = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
    Page.Title = ({ subTitle }: { subTitle?: React.ReactNode }) => <div>{subTitle}</div>;
    return { Page };
});

vi.mock('../../../components/ListingTable', () => ({
    ListingTable: ({ columns = [], dataSource = [] }: any) => (
        <div data-testid="listing-table">
            <div data-testid="columns">{columns.map((column: any) => String(column.title)).join('|')}</div>
            {dataSource.map((row: any, rowIndex: number) => (
                <div key={row.requestId ?? rowIndex} data-testid="log-row">
                    {columns.map((column: any, columnIndex: number) => {
                        const value = column.dataIndex ? row[column.dataIndex] : undefined;
                        const cell = column.render ? column.render(value, row, rowIndex) : value;
                        return <div key={column.key ?? column.dataIndex ?? columnIndex}>{cell}</div>;
                    })}
                </div>
            ))}
        </div>
    ),
}));

vi.mock('../../../hooks/useCaseHandoverLogsData', () => ({
    useCaseHandoverLogsData: () => ({
        data: {
            data: [
                {
                    requestId: 1,
                    sessionId: 42,
                    status: 'GRANTED',
                    auditOutcome: 'GRANTED_WITHOUT_CONSENT',
                    reasonCode: 'COUNSELLOR_IS_ILL',
                    reasonLabel: 'Counsellor is ill',
                    explanation: 'should no longer be shown',
                    clientConsentRequired: true,
                    createdAt: '2026-07-01T10:00:00Z',
                    requesterName: 'Requesting Counsellor',
                    previousName: 'Previous Counsellor',
                },
            ],
            total: 1,
            page: 1,
            perPage: 20,
        },
        isLoading: false,
    }),
}));

describe('CaseHandoverLogsPage', () => {
    it('renders the audit log entries (who, when, reason, outcome)', () => {
        render(<CaseHandoverLogsPage />);

        expect(screen.getByText('Counsellor is ill')).toBeInTheDocument();
        expect(screen.getByText('Requesting Counsellor')).toBeInTheDocument();
        expect(screen.getByText('Previous Counsellor')).toBeInTheDocument();
        expect(screen.getByText('GRANTED_WITHOUT_CONSENT')).toBeInTheDocument();
    });

    it('is results-only: no policy editing and no free-text explanation column', () => {
        render(<CaseHandoverLogsPage />);

        const columnTitles = screen.getByTestId('columns').textContent ?? '';
        expect(columnTitles).not.toContain('caseHandoverLogs.table.explanation');
        expect(columnTitles).not.toContain('caseHandoverLogs.table.consent');
        expect(screen.queryByText('caseHandoverLogs.policy.title')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'caseHandoverLogs.policy.save' })).not.toBeInTheDocument();
        expect(screen.queryByText('should no longer be shown')).not.toBeInTheDocument();
    });
});
