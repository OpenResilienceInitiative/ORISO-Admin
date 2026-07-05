import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Error404 } from './Error404';
import { AccessDenied } from './ErrorPages/AccessDenied';

const mocks = vi.hoisted(() => ({
    hasRole: vi.fn(),
}));

const translations: Record<string, string> = {
    'errorPages.accessDenied.description': 'You do not have access to this area.',
    'errorPages.accessDenied.title': 'Access denied',
    'errorPages.notFound.description': 'This page does not exist.',
    toHomePage: 'Go to homepage',
};

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => translations[key] || key }),
}));

vi.mock('../components/Layout/PublicPageLayoutWrapper', () => ({
    default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock('../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({ hasRole: mocks.hasRole }),
}));

vi.mock('../resources/img/illustrations/unauthorized.svg', () => ({
    ReactComponent: () => <svg aria-label="unauthorized" />,
}));

describe('error pages', () => {
    it('renders a translated 404 page with a home link', () => {
        render(
            <MemoryRouter>
                <Error404 />
            </MemoryRouter>,
        );

        expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument();
        expect(screen.getByText('This page does not exist.')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Go to homepage' })).toHaveAttribute('href', '/');
    });

    it('sends admin users back to the admin app from access denied', () => {
        mocks.hasRole.mockReturnValue(true);

        render(<AccessDenied />);

        expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
        expect(screen.getByText('You do not have access to this area.')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Go to homepage' })).toHaveAttribute('href', '/admin');
    });

    it('sends non-admin users back to the frontend app from access denied', () => {
        mocks.hasRole.mockReturnValue(false);

        render(<AccessDenied />);

        expect(screen.getByRole('link', { name: 'Go to homepage' })).toHaveAttribute('href', '/app');
    });
});
