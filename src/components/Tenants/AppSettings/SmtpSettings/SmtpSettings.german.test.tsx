import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vite-plus/test';
import i18n from '../../../../i18n';
import { spanOf } from '../../../CardGrid/cardGridTestUtils';
import { SmtpSettings } from './index';

/** The email server tile in German, with the real translations (the other tests echo the keys). */

vi.mock('../../../../context/useAppConfig', () => ({ useAppConfigContext: () => ({ settings: {} }) }));
vi.mock('../../../../hooks/useSingleTenantData', () => ({
    TENANT_QUERY_KEY: 'TENANT',
    useSingleTenantData: () => ({
        data: {
            id: 1,
            settings: {
                smtpMode: 'OWN',
                smtp: { enabled: true, host: 'smtp.tenant.org', port: 587, from: 'tenant@example.org' },
            },
        },
        isLoading: false,
    }),
}));
vi.mock('../../../../hooks/useTenantAdminDataMutation.hook', () => ({
    useTenantAdminDataMutation: () => ({ mutate: vi.fn() }),
}));

describe('SmtpSettings in German', () => {
    beforeAll(async () => {
        await i18n.changeLanguage('de');
    });

    it('labels the password field "Neues SMTP-Passwort"', () => {
        render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <SmtpSettings tenantId="1" />
            </QueryClientProvider>,
        );

        expect(screen.getByLabelText('Neues SMTP-Passwort')).toBeInTheDocument();
        expect(screen.queryByText(/Passwort setzen/)).toBeNull();
    });

    it('puts the server settings first, two columns wide, and the server test after them', () => {
        const { container } = render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <SmtpSettings tenantId="1" />
            </QueryClientProvider>,
        );
        const [server, test, ...rest] = [...container.querySelectorAll('[data-admin-card-grid-item]')];

        expect(rest).toHaveLength(0);
        expect(server).toContainElement(screen.getByLabelText('Neues SMTP-Passwort'));
        expect(test).toContainElement(screen.getByRole('button', { name: 'Testmail an mich senden' }));
        expect([spanOf(server), spanOf(test)]).toEqual([2, 1]);
    });
});
