import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { LegalSettings } from './index';

const roleState = vi.hoisted(() => ({ isSuperAdmin: false, isTenantScopedAdmin: false }));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../CustomIcons/LegalIcons', () => ({ GdprIcon: () => null, ImprintIcon: () => null }));
vi.mock('../../CardEditable', () => ({ CardEditable: () => null }));
vi.mock('../../FormSwitchField', () => ({ FormSwitchField: () => null }));
vi.mock('../../../context/useAppConfig', () => ({ useAppConfigContext: () => ({ settings: {} }) }));
vi.mock('../../../hooks/useSettingsAdminMutation.hook', () => ({
    useSettingsAdminMutation: () => ({ mutate: vi.fn() }),
}));
vi.mock('../../../hooks/useTenantData.hook', () => ({ useTenantData: () => ({ data: { id: 5 } }) }));
vi.mock('./components/LegalText', () => ({
    LegalText: ({ collapsible }: { collapsible?: boolean }) => (
        <div data-testid="plain-legal-text" data-collapsible={String(!!collapsible)} />
    ),
}));
vi.mock('./components/LegalText/TraegerLegalText', () => ({
    TraegerLegalText: ({ legalType }: { legalType: string }) => <div data-testid={`traeger-${legalType}`} />,
}));
vi.mock('./components/DataProcessingAgreementContainer', () => ({
    DataProcessingAgreementContainer: ({ collapsible }: { collapsible?: boolean }) => (
        <div data-testid="dpa" data-collapsible={String(!!collapsible)} />
    ),
}));
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

    it('keeps the cards unless the page asks for tiles', () => {
        render(<LegalSettings tenantId={5} draftTenantId={0} />);
        expect(screen.getByTestId('dpa')).toHaveAttribute('data-collapsible', 'false');
        screen
            .getAllByTestId('plain-legal-text')
            .forEach((card) => expect(card).toHaveAttribute('data-collapsible', 'false'));
    });

    it('shows the agreement, the imprint and the privacy statement as tiles when the page asks for it', () => {
        render(<LegalSettings tenantId={5} draftTenantId={0} collapsible />);
        expect(screen.getByTestId('dpa')).toHaveAttribute('data-collapsible', 'true');
        screen
            .getAllByTestId('plain-legal-text')
            .forEach((card) => expect(card).toHaveAttribute('data-collapsible', 'true'));
    });
});
