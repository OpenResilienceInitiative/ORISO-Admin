import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { spanOf } from '../../../CardGrid/cardGridTestUtils';

vi.mock('../OtherFunctionsSettings', () => ({
    OtherFunctionsSettings: (props: Record<string, unknown>) => (
        <div data-testid="other-functions">{JSON.stringify(props)}</div>
    ),
}));

vi.mock('../TraegerLicenceSenderSettings', () => ({
    TraegerLicenceSenderSettings: (props: Record<string, unknown>) => (
        <div data-testid="licence-sender">{JSON.stringify(props)}</div>
    ),
}));

// eslint-disable-next-line import/first
import { FunctionalitiesGrid } from './index';

describe('FunctionalitiesGrid ("Weitere")', () => {
    it('lays one full-width tile into the settings raster', () => {
        const { container } = render(<FunctionalitiesGrid tenantId="7" />);
        const items = container.querySelectorAll<HTMLElement>('[data-admin-card-grid-item]');

        expect(items).toHaveLength(1);
        expect(spanOf(items[0])).toBe(3);
        expect(screen.getByTestId('other-functions')).toBeInTheDocument();
        expect(screen.queryByTestId('licence-sender')).toBeNull();
        // The old layout was an antd Row/Col stack; the raster must not fall back to it.
        expect(container.querySelector('.ant-row')).toBeNull();
    });

    it('passes the statistics flag on to the tile unchanged', () => {
        render(<FunctionalitiesGrid tenantId="7" hideStatistics />);

        expect(JSON.parse(screen.getByTestId('other-functions').textContent ?? '{}')).toEqual({
            tenantId: '7',
            hideStatistics: true,
        });
    });

    // Frank, 2026-11-20: on the Träger page, licence and sender moved here from Stammdaten.
    it('adds the licence and sender tile after the other functions when the page asks for it', () => {
        const { container } = render(<FunctionalitiesGrid tenantId="7" withLicenceAndSender />);
        const items = container.querySelectorAll<HTMLElement>('[data-admin-card-grid-item]');

        expect(items).toHaveLength(2);
        expect(items[0]).toContainElement(screen.getByTestId('other-functions'));
        expect(items[1]).toContainElement(screen.getByTestId('licence-sender'));
        expect(spanOf(items[1])).toBe(3);
        expect(JSON.parse(screen.getByTestId('licence-sender').textContent ?? '{}')).toEqual({ tenantId: '7' });
    });
});
