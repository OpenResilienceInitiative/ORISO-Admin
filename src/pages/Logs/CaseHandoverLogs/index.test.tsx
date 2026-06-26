import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CaseHandoverLogsPage } from './index';

const mocks = vi.hoisted(() => ({
    mutate: vi.fn(),
    reasonPolicies: [
        {
            code: 'MEDICAL',
            label: 'Medical reason',
            clientConsentRequired: true,
            accessAllowed: true,
            enabled: true,
            displayOrder: 1,
            policyAuthority: null,
        },
    ],
}));

const translations: Record<string, string> = {
    'caseHandoverLogs.policy.title': 'Reason policies',
    'caseHandoverLogs.policy.save': 'Save policies',
    'caseHandoverLogs.policy.table.code': 'Code',
    'caseHandoverLogs.policy.table.label': 'Label',
    'caseHandoverLogs.policy.table.clientConsentRequired': 'Client consent',
    'caseHandoverLogs.policy.table.accessAllowed': 'Access allowed',
    'caseHandoverLogs.policy.table.enabled': 'Enabled',
    'caseHandoverLogs.policy.table.displayOrder': 'Order',
    'caseHandoverLogs.policy.table.policyAuthority': 'Policy authority',
};

const t = (key: string) => translations[key] || key;

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
        <div>
            {dataSource.map((row: any, rowIndex: number) => (
                <div key={row.code ?? row.requestId ?? rowIndex}>
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
        data: { data: [], total: 0, page: 1, perPage: 20 },
        isLoading: false,
    }),
}));

vi.mock('../../../hooks/useCaseHandoverReasonPolicies', () => ({
    useCaseHandoverReasonPoliciesData: () => ({
        data: mocks.reasonPolicies,
        isLoading: false,
    }),
    useCaseHandoverReasonPoliciesMutation: () => ({
        isLoading: false,
        mutate: mocks.mutate,
    }),
}));

vi.mock('../../../hooks/useUserPermission', () => ({
    useUserPermissions: () => ({
        can: () => true,
    }),
}));

vi.mock('../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({
        isSuperAdmin: false,
    }),
}));

describe('CaseHandoverLogsPage', () => {
    beforeEach(() => {
        mocks.mutate.mockReset();
    });

    it('allows editing policy authority and sends it in the save payload', async () => {
        const user = userEvent.setup();

        render(<CaseHandoverLogsPage />);

        const input = await screen.findByRole('textbox', { name: 'Policy authority (MEDICAL)' });
        await user.type(input, 'Tenant policy board');
        await user.click(screen.getByRole('button', { name: 'Save policies' }));

        await waitFor(() => {
            expect(mocks.mutate).toHaveBeenCalledWith([
                expect.objectContaining({
                    code: 'MEDICAL',
                    policyAuthority: 'Tenant policy board',
                }),
            ]);
        });
    });
});
