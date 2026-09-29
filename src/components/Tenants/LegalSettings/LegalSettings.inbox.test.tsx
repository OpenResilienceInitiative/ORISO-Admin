import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LegalSettings } from './index';

const roleState = vi.hoisted(() => ({ isSuperAdmin: false, isTenantScopedAdmin: false }));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../CustomIcons/LegalIcons', () => ({ GdprIcon: () => null, ImprintIcon: () => null }));
vi.mock('../../CardDeck', () => {
    const CardDeck = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
    CardDeck.Item = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
    return { CardDeck };
});
vi.mock('../../CardEditable', () => ({ CardEditable: () => null }));
vi.mock('../../FormSwitchField', () => ({ FormSwitchField: () => null }));
vi.mock('../../../context/useAppConfig', () => ({ useAppConfigContext: () => ({ settings: {} }) }));
vi.mock('../../../hooks/useSettingsAdminMutation.hook', () => ({
    useSettingsAdminMutation: () => ({ mutate: vi.fn() }),
}));
vi.mock('../../../hooks/useTenantData.hook', () => ({ useTenantData: () => ({ data: { id: 5 } }) }));
vi.mock('./components/LegalText', () => ({ LegalText: () => <div data-testid="plain-legal-text" /> }));
vi.mock('./components/LegalText/TraegerLegalText', () => ({
    TraegerLegalText: ({ legalType }: { legalType: string }) => <div data-testid={`traeger-${legalType}`} />,
}));
vi.mock('./components/DataProcessingAgreementContainer', () => ({ DataProcessingAgreementContainer: () => null }));
vi.mock('../../../hooks/useUserRoles.hook', () => ({ useUserRoles: () => roleState }));

describe('LegalSettings received templates', () => {
    beforeEach(() => {
        roleState.isSuperAdmin = false;
        roleState.isTenantScopedAdmin = false;
    });

    it('shows the existing Träger inbox when the platform admin opens that Träger', () => {
        roleState.isSuperAdmin = true;
        render(<LegalSettings tenantId={17} />);
        expect(screen.getByTestId('traeger-imprint')).toBeInTheDocument();
        expect(screen.getByTestId('traeger-privacy')).toBeInTheDocument();
    });

    it('keeps the platform document on the platform editor', () => {
        roleState.isSuperAdmin = true;
        render(<LegalSettings tenantId={5} draftTenantId={0} />);
        expect(screen.queryByTestId('traeger-imprint')).toBeNull();
        expect(screen.getAllByTestId('plain-legal-text')).toHaveLength(2);
    });
});
