import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getPublicDpiaMasterData } from '../../api/tenant/getPublicDpiaMasterData';
import { PublicDpiaDocument } from './PublicDpiaDocument';
import { populatedMasterData } from './__fixtures__/masterData';

vi.mock('../../api/tenant/getPublicDpiaMasterData', () => ({ getPublicDpiaMasterData: vi.fn() }));
const renderPublic = () =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <PublicDpiaDocument />
        </QueryClientProvider>,
    );
const noArtifactFallback = () => {
    expect(
        screen.queryByText(/Sunflower CARE|Musterstraße|14\.08\.2026|14\.08\.2027|9\.640|Beispieldaten/),
    ).not.toBeInTheDocument();
};

describe('public DPIA master data through the real query hook', () => {
    it('renders loading while the endpoint is pending', () => {
        vi.mocked(getPublicDpiaMasterData).mockImplementation(() => new Promise(() => {}));
        renderPublic();
        expect(screen.getByRole('status')).toHaveTextContent('DPIA-Stammdaten werden geladen');
        expect(screen.queryByRole('main')).not.toBeInTheDocument();
        noArtifactFallback();
    });
    it('renders an explicit unavailable state for endpoint errors', async () => {
        vi.mocked(getPublicDpiaMasterData).mockRejectedValue(new Error('503'));
        renderPublic();
        expect(await screen.findByRole('alert')).toHaveTextContent('derzeit nicht verfügbar');
        expect(screen.queryByRole('main')).not.toBeInTheDocument();
        noArtifactFallback();
    });
    it('renders supplied identity, DPO, authority, dates and every dated figure including zero, using the saved preset', async () => {
        vi.mocked(getPublicDpiaMasterData).mockResolvedValue(populatedMasterData);
        renderPublic();
        const scope = await screen.findByRole('region', { name: 'Einleitung, Scope und Stammdaten' });
        expect(within(scope).getByText('Beispielberatung Test gGmbH')).toBeInTheDocument();
        expect(within(scope).getByText('Datenschutzstelle Test')).toBeInTheDocument();
        expect(
            within(scope).getByText(/Test-Aufsichtsbehörde.*Prüfweg 5.*aufsicht@example.invalid/),
        ).toBeInTheDocument();
        expect(within(scope).getByText('2027-09-15')).toBeInTheDocument();
        expect(
            within(screen.getByRole('radiogroup', { name: 'Compliance-Preset' })).getByRole('radio', {
                name: 'DSGVO',
            }),
        ).toHaveAttribute('aria-checked', 'true');
        const figures = screen.getByRole('region', { name: 'Kontext und Kennzahlen' });
        ['7', '43', '0', '1.234'].forEach((value) => expect(within(figures).getByText(value)).toBeInTheDocument());
        ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'].forEach((date) =>
            expect(within(figures).getByText(`Stand: ${date}`)).toBeInTheDocument(),
        );
        noArtifactFallback();
    });
    it.each([
        null,
        {},
        {
            operator: { legalName: null, shortName: '   ', dpoName: '' },
            document: { documentDate: ' ', nextReviewDate: '' },
            keyFigures: { tenants: { count: null, asOfDate: ' ' } },
        },
    ])('makes null/blank data explicitly missing without sample fallbacks (%j)', async (data) => {
        vi.mocked(getPublicDpiaMasterData).mockResolvedValue(data);
        renderPublic();
        expect(await screen.findByRole('main')).toBeInTheDocument();
        expect(screen.getAllByText('Nicht hinterlegt').length).toBeGreaterThanOrEqual(8);
        expect(screen.getByRole('region', { name: 'Kontext und Kennzahlen' })).toHaveTextContent(
            'Stand: Nicht hinterlegt',
        );
        noArtifactFallback();
    });
});
