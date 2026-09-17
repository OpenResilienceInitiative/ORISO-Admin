import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { AccessDenied } from './AccessDenied';

const logoutMock = vi.fn();
vi.mock('../../api/auth/logout', () => ({ default: (...args: unknown[]) => logoutMock(...args) }));
vi.mock('../../hooks/useUserRoles.hook', () => ({ useUserRoles: () => ({ hasRole: () => false }) }));
vi.mock('../../components/Layout/PublicPageLayoutWrapper', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('AccessDenied', () => {
    it('offers a logout so a 403 loop is escapable', () => {
        render(<AccessDenied />);

        fireEvent.click(screen.getByRole('button', { name: 'logout' }));

        expect(logoutMock).toHaveBeenCalledWith(true);
        expect(screen.getByRole('link', { name: 'toHomePage' })).toHaveAttribute('href', '/app');
    });
});
