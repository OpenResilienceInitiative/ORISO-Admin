import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { spanOf } from '../../../CardGrid/cardGridTestUtils';

vi.mock('../OtherFunctionsSettings', () => ({
    OtherFunctionsSettings: (props: Record<string, unknown>) => (
        <div data-testid="other-functions">{JSON.stringify(props)}</div>
    ),
}));

// eslint-disable-next-line import/first
import { FunctionalitiesGrid } from './index';

describe('FunctionalitiesGrid', () => {
    // ORISO-Admin#1577: one full-width tile with folding sections; the email server has its own tab.
    it('lays one full-width tile into the settings raster', () => {
        const { container } = render(<FunctionalitiesGrid tenantId="7" />);
        const items = container.querySelectorAll<HTMLElement>('[data-admin-card-grid-item]');

        expect(items).toHaveLength(1);
        expect(spanOf(items[0])).toBe(3);
        expect(screen.getByTestId('other-functions')).toBeInTheDocument();
        // The old layout was an antd Row/Col stack; the raster must not fall back to it.
        expect(container.querySelector('.ant-row')).toBeNull();
    });

    it('passes the hide flags on to the tile unchanged', () => {
        render(<FunctionalitiesGrid tenantId="7" hideCalls hideStatistics hideGroupChatToggle />);

        expect(JSON.parse(screen.getByTestId('other-functions').textContent ?? '{}')).toEqual({
            tenantId: '7',
            hideCalls: true,
            hideStatistics: true,
            hideGroupChatToggle: true,
        });
    });
});
