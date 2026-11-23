import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { TourHost } from './TourHost';
import { tourLaunchStore } from './tourLaunchStore';
import { versionedTourProgressRepository } from './versionedTourProgressRepository';
import type { TourDefinition, TourProgress } from './types';

const adapterMounts = vi.hoisted(() => ({ count: 0 }));
const adapterProps = vi.hoisted(() => ({ current: null as any }));

vi.mock('./ProductTourAdapter', async () => {
    const { useEffect } = await import('react');
    return {
        ProductTourAdapter: (props: any) => {
            adapterProps.current = props;
            useEffect(() => {
                adapterMounts.count += 1;
            }, []);
            return <div data-testid="tour-adapter">{props.tour.id}</div>;
        },
    };
});

vi.mock('./versionedTourProgressRepository', () => ({
    versionedTourProgressRepository: { saveProgress: vi.fn(), getProgress: vi.fn(() => Promise.resolve([])) },
}));

const tour: TourDefinition = {
    id: 'host-tour',
    version: 2,
    surface: 'admin',
    audiences: ['agency_admin'],
    titleKey: 'title',
    summaryKey: 'summary',
    steps: [{ id: 'welcome', target: '', placement: 'center', titleKey: 't', contentKey: 'c' }],
};

const progress: TourProgress = { tourId: 'host-tour', tourVersion: 2, status: 'completed', currentStepId: 'welcome' };

const renderWithPages = () =>
    render(
        <MemoryRouter initialEntries={['/admin/profile']}>
            <TourHost tours={[tour]} />
            <Routes>
                <Route path="/admin/profile" element={<Link to="/admin/home">to home</Link>} />
                <Route path="/admin/home" element={<p>home page</p>} />
            </Routes>
        </MemoryRouter>,
    );

beforeEach(() => {
    adapterMounts.count = 0;
    adapterProps.current = null;
    vi.mocked(versionedTourProgressRepository.saveProgress).mockReset();
});

afterEach(() => {
    cleanup();
    tourLaunchStore.reset();
});

describe('TourHost', () => {
    it('renders nothing while no tour is requested', () => {
        renderWithPages();
        expect(screen.queryByTestId('tour-adapter')).toBeNull();
    });

    it('keeps a running tour mounted across page navigation', async () => {
        renderWithPages();
        act(() => tourLaunchStore.requestLaunch('host-tour'));
        expect(screen.getByTestId('tour-adapter')).toHaveTextContent('host-tour');

        await userEvent.click(screen.getByRole('link', { name: 'to home' }));

        expect(screen.getByText('home page')).toBeInTheDocument();
        expect(screen.getByTestId('tour-adapter')).toBeInTheDocument();
        expect(adapterMounts.count).toBe(1);
    });

    it('saves the terminal progress and releases the host', async () => {
        vi.mocked(versionedTourProgressRepository.saveProgress).mockResolvedValue();
        renderWithPages();
        act(() => tourLaunchStore.requestLaunch('host-tour'));

        await act(() => adapterProps.current.onTerminalStatus(progress));

        expect(versionedTourProgressRepository.saveProgress).toHaveBeenCalledWith(progress);
        expect(screen.queryByTestId('tour-adapter')).toBeNull();
        expect(tourLaunchStore.getSnapshot().progressRevision).toBe(1);
    });

    it('releases the host even when the progress write fails', async () => {
        vi.mocked(versionedTourProgressRepository.saveProgress).mockRejectedValue(new Error('offline'));
        renderWithPages();
        act(() => tourLaunchStore.requestLaunch('host-tour'));

        await act(async () => {
            await adapterProps.current.onTerminalStatus(progress).catch(() => undefined);
        });

        expect(screen.queryByTestId('tour-adapter')).toBeNull();
    });

    it('releases the host without saving when the tour closes with no presentable step', () => {
        renderWithPages();
        act(() => tourLaunchStore.requestLaunch('host-tour'));

        act(() => adapterProps.current.onAbort());

        expect(screen.queryByTestId('tour-adapter')).toBeNull();
        expect(versionedTourProgressRepository.saveProgress).not.toHaveBeenCalled();
    });

    it('drops a request for a tour it does not know', async () => {
        renderWithPages();
        act(() => tourLaunchStore.requestLaunch('unknown-tour'));

        await waitFor(() => expect(tourLaunchStore.getSnapshot().request).toBeNull());
        expect(screen.queryByTestId('tour-adapter')).toBeNull();
    });
});
