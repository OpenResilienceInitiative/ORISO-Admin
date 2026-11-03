import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../enums/UserRole';
import { UserProfile } from './UserProfile';

const hasRole = vi.fn();
const settings = { documentationEnabled: true };

vi.mock('../../hooks/useUserRoles.hook', () => ({ useUserRoles: () => ({ hasRole }) }));
vi.mock('../../context/useAppConfig', () => ({ useAppConfigContext: () => ({ settings }) }));
vi.mock('../../components/Page', () => {
    const Page = ({ children }: { children: unknown }) => <main>{children as never}</main>;
    Page.Title = () => null;
    return { Page };
});
vi.mock('./PrivateData', () => ({ PrivateData: () => <div>tile-private-data</div> }));
vi.mock('./RolesAndAssignment', () => ({ RolesAndAssignment: () => <div>tile-roles</div> }));
vi.mock('./PassswordChange', () => ({ PasswordChange: () => <div>tile-password</div> }));
vi.mock('./TwoFactorCard', () => ({ TwoFactorCard: () => <div>tile-two-factor</div> }));
vi.mock('./LanguageSettings', () => ({ LanguageSettings: () => <div>tile-language</div> }));
vi.mock('./Absence', () => ({ Absence: () => <div>tile-absence</div> }));
vi.mock('./Documentation', () => ({ Documentation: () => <div>tile-documentation</div> }));
vi.mock('../../components/productTour/TourOverviewSection', () => ({
    TourOverviewSection: () => <div>tile-tour</div>,
}));
// Only this tile knows about the grid: it can render nothing, so it brings its own raster cell.
vi.mock('./SelfConsultantIdentity', async () => {
    const { CardGrid } = await import('../../components/CardGrid');
    return {
        SelfConsultantIdentity: () => (
            <CardGrid.Item>
                <div>tile-self-consultant</div>
            </CardGrid.Item>
        ),
    };
});

const tiles = [
    'tile-private-data',
    'tile-roles',
    'tile-self-consultant',
    'tile-password',
    'tile-two-factor',
    'tile-language',
    'tile-absence',
    'tile-tour',
    'tile-documentation',
];

describe('UserProfile', () => {
    beforeEach(() => {
        hasRole.mockReset().mockReturnValue(false);
        settings.documentationEnabled = true;
    });

    it('lays every tile out in the settings raster', () => {
        const { container } = render(<UserProfile />);

        expect(container.querySelector('[data-admin-card-raster]')).not.toBeNull();
        tiles.forEach((name) => {
            expect(screen.getByText(name).closest('[data-admin-card-grid-item]')).not.toBeNull();
        });
    });

    it('leaves out the personal data tile for a Träger admin and the documentation when it is off', () => {
        hasRole.mockImplementation((role: UserRole) => role === UserRole.TenantAdmin);
        settings.documentationEnabled = false;
        const { container } = render(<UserProfile />);

        expect(screen.queryByText('tile-private-data')).toBeNull();
        expect(screen.queryByText('tile-documentation')).toBeNull();
        expect(container.querySelectorAll('[data-admin-card-grid-item]')).toHaveLength(tiles.length - 2);
    });
});
