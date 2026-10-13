import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LegalSettings } from './index';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../CustomIcons/LegalIcons', () => ({ GdprIcon: () => null, ImprintIcon: () => null }));
vi.mock('../../CardDeck', () => {
    const CardDeck = ({ children }: { children: React.ReactNode }) => <ul data-testid="deck">{children}</ul>;
    CardDeck.Item = ({ children }: { children: React.ReactNode }) => <li>{children}</li>;
    return { CardDeck };
});
vi.mock('../../CardEditable', () => ({ CardEditable: () => <div data-testid="card-single-tenant-toggle" /> }));
vi.mock('../../FormSwitchField', () => ({ FormSwitchField: () => null }));
vi.mock('../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: { multitenancyWithSingleDomainEnabled: true } }),
}));
vi.mock('../../../hooks/useSettingsAdminMutation.hook', () => ({
    useSettingsAdminMutation: () => ({ mutate: vi.fn() }),
}));
vi.mock('../../../hooks/useTenantData.hook', () => ({ useTenantData: () => ({ data: { id: 5 } }) }));
vi.mock('./components/LegalText', () => ({
    LegalText: ({ legalType }: { legalType: string }) => <div data-testid={`card-${legalType}`} />,
}));
vi.mock('./components/LegalText/TraegerLegalText', () => ({
    TraegerLegalText: ({ legalType }: { legalType: string }) => <div data-testid={`card-${legalType}`} />,
}));
vi.mock('./components/DataProcessingAgreementContainer', () => ({
    DataProcessingAgreementContainer: () => <div data-testid="card-dpa" />,
}));
vi.mock('../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({ isSuperAdmin: true, isTenantScopedAdmin: false }),
}));

/**
 * ORISO-Admin#1196: the documents an admin works on come first (privacy statement, imprint,
 * data processing agreement); the rarely used single-tenant switch comes last.
 */
describe('LegalSettings card order', () => {
    it('shows privacy statement, imprint, data processing agreement, then the single-tenant switch', () => {
        render(<LegalSettings tenantId={17} />);

        const order = within(screen.getByTestId('deck'))
            .getAllByTestId(/^card-/)
            .map((card) => card.dataset.testid);

        expect(order).toEqual(['card-privacy', 'card-imprint', 'card-dpa', 'card-single-tenant-toggle']);
    });
});
