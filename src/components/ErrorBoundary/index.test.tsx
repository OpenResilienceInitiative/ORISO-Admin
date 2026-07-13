import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
});
