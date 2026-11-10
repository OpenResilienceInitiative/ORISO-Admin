import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { CardGrid } from '../../CardGrid';
import { GeneralSettings } from './index';

vi.mock('../../../hooks/useUserRoles.hook', () => ({ useUserRoles: () => ({ isSuperAdmin: true }) }));
vi.mock('../../../hooks/useUserPermission', () => ({ useUserPermissions: () => ({ can: () => true }) }));
vi.mock('../../../hooks/useTenantData.hook', () => ({ useTenantData: () => ({ data: { id: 7 } }) }));
vi.mock('../../../hooks/useAppearanceEditingRights.hook', () => ({
    useAppearanceEditingRights: () => ({ editable: true, isLoading: false, save: vi.fn() }),
}));
vi.mock('./components/LogoAndFavicon', () => ({ LogoAndFavicon: () => <i data-testid="logo" /> }));
vi.mock('./components/AssistantIdentity', () => ({ AssistantIdentity: () => <i data-testid="assistant" /> }));
vi.mock('./components/Languages', () => ({ Languages: () => <i data-testid="languages" /> }));
vi.mock('./components/ThemeBuilder', () => ({ ThemeBuilder: () => <i data-testid="theme" /> }));
vi.mock('./components/NameAndSlogan', () => ({ NameAndSlogan: () => <i data-testid="name" /> }));
vi.mock('./components/TypeOfLanguage', () => ({ TypeOfLanguage: () => <i data-testid="language-type" /> }));
vi.mock('./components/EditingRightsCard', () => ({ EditingRightsCard: () => <i data-testid="rights" /> }));

const leading = (
    <CardGrid.Item>
        <i data-testid="leading" />
    </CardGrid.Item>
);

describe('GeneralSettings leadingTiles', () => {
    it('puts the given tiles first in the raster of the master data section', () => {
        const { container } = render(<GeneralSettings tenantId="7" section="masterData" leadingTiles={leading} />);

        const order = Array.from(container.querySelectorAll('[data-admin-card-grid-item] > [data-testid]')).map(
            (tile) => tile.getAttribute('data-testid'),
        );
        expect(order).toEqual(['leading', 'name', 'language-type', 'rights']);
    });

    it('leaves the appearance section alone: the tiles belong to the master data tab only', () => {
        render(<GeneralSettings tenantId="7" section="appearance" leadingTiles={leading} />);

        expect(screen.queryByTestId('leading')).toBeNull();
        expect(screen.getByTestId('logo')).toBeInTheDocument();
    });
});
