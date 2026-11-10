import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { GeneralSettings } from './index';

const roles = vi.hoisted(() => ({ isSuperAdmin: false }));

vi.mock('../../../hooks/useUserRoles.hook', () => ({ useUserRoles: () => roles }));
vi.mock('../../../hooks/useUserPermission', () => ({ useUserPermissions: () => ({ can: () => true }) }));
vi.mock('../../../hooks/useTenantData.hook', () => ({ useTenantData: () => ({ data: { id: 7 } }) }));
vi.mock('../../../hooks/useAppearanceEditingRights.hook', () => ({
    useAppearanceEditingRights: () => ({ editable: true, isLoading: false, save: vi.fn() }),
}));
vi.mock('../OwnTenantInformation', () => ({ OwnTenantInformation: () => <i data-testid="own-tenant-information" /> }));
vi.mock('./components/LogoAndFavicon', () => ({ LogoAndFavicon: () => <i data-testid="logo" /> }));
vi.mock('./components/AssistantIdentity', () => ({ AssistantIdentity: () => <i data-testid="assistant" /> }));
vi.mock('./components/Languages', () => ({ Languages: () => <i data-testid="languages" /> }));
vi.mock('./components/ThemeBuilder', () => ({ ThemeBuilder: () => <i data-testid="theme" /> }));
vi.mock('./components/NameAndSlogan', () => ({ NameAndSlogan: () => <i data-testid="name" /> }));
vi.mock('./components/TypeOfLanguage', () => ({ TypeOfLanguage: () => <i data-testid="language-type" /> }));
vi.mock('./components/EditingRightsCard', () => ({ EditingRightsCard: () => <i data-testid="rights" /> }));

describe('GeneralSettings: the Träger admin sees their own Träger information (ORISO-Admin#1466)', () => {
    beforeEach(() => {
        roles.isSuperAdmin = false;
    });

    it('shows the Träger information first on the Träger admin master data tab', () => {
        const { container } = render(<GeneralSettings section="masterData" />);

        const order = Array.from(container.querySelectorAll('[data-admin-card-grid-item] > [data-testid]')).map(
            (tile) => tile.getAttribute('data-testid'),
        );
        expect(order).toEqual(['own-tenant-information', 'name', 'language-type', 'rights']);
    });

    it('leaves the platform admin alone: the Träger page brings its own editable card', () => {
        roles.isSuperAdmin = true;
        render(<GeneralSettings section="masterData" />);

        expect(screen.queryByTestId('own-tenant-information')).toBeNull();
    });

    it('shows the tiles the embedding page brings instead of its own card', () => {
        render(<GeneralSettings section="masterData" leadingTiles={<i data-testid="page-tile" />} />);

        expect(screen.getByTestId('page-tile')).toBeInTheDocument();
        expect(screen.queryByTestId('own-tenant-information')).toBeNull();
    });

    it('keeps the appearance tab free of it', () => {
        render(<GeneralSettings section="appearance" />);

        expect(screen.queryByTestId('own-tenant-information')).toBeNull();
    });
});
