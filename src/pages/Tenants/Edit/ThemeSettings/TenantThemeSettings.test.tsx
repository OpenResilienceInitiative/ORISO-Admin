import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-router-dom', () => ({ useParams: () => ({ id: '7' }) }));
vi.mock('../../../../components/Tenants/GeneralSettings', () => ({
    GeneralSettings: ({ tenantId, section }: { tenantId?: string; section?: string }) => (
        <div data-testid="general-settings" data-tenant={tenantId} data-section={section} />
    ),
}));

// eslint-disable-next-line import/first
import { TenantThemeSettings } from './index';

describe('platform admin editing a Träger: Erscheinungsbild tab', () => {
    // The master data tiles (name, language type, editing rights) belong to the Stammdaten tab, as on
    // the Träger admin's own settings. Rendering "all" showed them twice, on two tabs.
    it('renders only the appearance tiles', () => {
        render(<TenantThemeSettings />);

        expect(screen.getByTestId('general-settings')).toHaveAttribute('data-section', 'appearance');
        expect(screen.getByTestId('general-settings')).toHaveAttribute('data-tenant', '7');
    });
});
