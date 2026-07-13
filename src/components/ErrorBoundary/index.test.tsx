import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './index';
import { reportClientError } from '../../api/reportClientError';

vi.mock('i18next', () => ({
    default: { t: (key: string) => key },
}));

vi.mock('../../api/reportClientError', () => ({
    reportClientError: vi.fn(),
}));

const Bomb = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
        throw new Error('boom');
    }
    return <div>page content</div>;
};

const RoutedPageBoundaryHarness = () => {
    const location = useLocation();

    return (
        <>
            <nav>Admin navigation</nav>
            <Link to="/admin/healthy">Healthy page</Link>
            <ErrorBoundary scope="page" resetKeys={[location.pathname]}>
                <Routes>
                    <Route path="/admin/broken" element={<Bomb shouldThrow />} />
                    <Route path="/admin/healthy" element={<Bomb shouldThrow={false} />} />
                </Routes>
            </ErrorBoundary>
        </>
    );
};

describe('ErrorBoundary', () => {
    beforeEach(() => {
        // React logs caught render errors; keep test output clean.
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.mocked(reportClientError).mockClear();
    });

    it('renders children when nothing throws', () => {
        render(
            <ErrorBoundary>
                <Bomb shouldThrow={false} />
            </ErrorBoundary>,
        );

        expect(screen.getByText('page content')).toBeInTheDocument();
    });

    it('shows the fallback with reload and login actions instead of unmounting the app', () => {
        render(
            <ErrorBoundary>
                <Bomb shouldThrow />
            </ErrorBoundary>,
        );

        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'errorBoundary.reload' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'errorBoundary.toLogin' })).toHaveAttribute('href', '/admin/login');
    });

    it('reports the caught error to the OBS-P3 error intake (best-effort)', () => {
        render(
            <ErrorBoundary scope="page">
                <Bomb shouldThrow />
            </ErrorBoundary>,
        );

        expect(reportClientError).toHaveBeenCalledTimes(1);
        expect(reportClientError).toHaveBeenCalledWith(
            expect.objectContaining({
                message: '[page] boom',
            }),
        );
    });

    it('resets the error state when a reset key changes (route navigation)', () => {
        const { rerender } = render(
            <ErrorBoundary resetKeys={['/admin/broken-page']}>
                <Bomb shouldThrow />
            </ErrorBoundary>,
        );

        expect(screen.getByRole('alert')).toBeInTheDocument();

        rerender(
            <ErrorBoundary resetKeys={['/admin/other-page']}>
                <Bomb shouldThrow={false} />
            </ErrorBoundary>,
        );

        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(screen.getByText('page content')).toBeInTheDocument();
    });

    it('keeps showing the fallback when reset keys are unchanged', () => {
        const { rerender } = render(
            <ErrorBoundary resetKeys={['/admin/broken-page']}>
                <Bomb shouldThrow />
            </ErrorBoundary>,
        );

        rerender(
            <ErrorBoundary resetKeys={['/admin/broken-page']}>
                <Bomb shouldThrow={false} />
            </ErrorBoundary>,
        );

        expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('keeps layout navigation mounted and resets the page fallback after route navigation', () => {
        render(
            <MemoryRouter initialEntries={['/admin/broken']}>
                <RoutedPageBoundaryHarness />
            </MemoryRouter>,
        );

        expect(screen.getByText('Admin navigation')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('link', { name: 'Healthy page' }));

        expect(screen.getByText('Admin navigation')).toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(screen.getByText('page content')).toBeInTheDocument();
    });
});
