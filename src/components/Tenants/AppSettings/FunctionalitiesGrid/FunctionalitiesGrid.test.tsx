import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { spanOf } from '../../../CardGrid/cardGridTestUtils';

vi.mock('../SmtpSettings', () => ({
    SmtpSettings: ({ tenantId }: { tenantId: string }) => <div data-testid="smtp">{tenantId}</div>,
}));
vi.mock('../CommunicationSettings', () => ({
    CommunicationSettings: ({ tenantId }: { tenantId: string }) => <div data-testid="communication">{tenantId}</div>,
}));
vi.mock('../OtherFunctionsSettings', () => ({
    OtherFunctionsSettings: (props: Record<string, unknown>) => (
        <div data-testid="other-functions">{JSON.stringify(props)}</div>
    ),
}));
vi.mock('../TopicsSettings', () => ({ TopicsSettings: () => <div data-testid="topics" /> }));

// eslint-disable-next-line import/first
import { FunctionalitiesGrid } from './index';

const tileCount = (container: HTMLElement) => container.querySelectorAll('[data-admin-card-grid-item]').length;

describe('FunctionalitiesGrid', () => {
    it('lays every tile into the settings raster, one grid item each', () => {
        const { container } = render(<FunctionalitiesGrid tenantId="7" />);

        expect(screen.getByTestId('smtp')).toHaveTextContent('7');
        expect(screen.getByTestId('communication')).toHaveTextContent('7');
        expect(screen.getByTestId('other-functions')).toBeInTheDocument();
        expect(screen.getByTestId('topics')).toBeInTheDocument();
        expect(tileCount(container)).toBe(4);
        // The old layout was an antd Row/Col stack; the raster must not fall back to it.
        expect(container.querySelector('.ant-row')).toBeNull();
    });

    it('keeps the email server, communication and other-functions tiles in reading order and spans', () => {
        const { container } = render(<FunctionalitiesGrid tenantId="7" />);
        const spanByTile: Record<string, number> = { smtp: 3, communication: 1, 'other-functions': 2 };
        // Only these three tiles are looked at, so a tile that is added or removed elsewhere in the tab does not
        // change this test.
        const tiles = [...container.querySelectorAll<HTMLElement>('[data-admin-card-grid-item]')]
            .map((item) => ({ id: item.querySelector('[data-testid]')?.getAttribute('data-testid') ?? '', item }))
            .filter(({ id }) => id in spanByTile);

        expect(tiles.map(({ id }) => id)).toEqual(['smtp', 'communication', 'other-functions']);
        expect(Object.fromEntries(tiles.map(({ id, item }) => [id, spanOf(item)]))).toEqual(spanByTile);
    });

    it('drops the tiles a level hides', () => {
        const { container } = render(<FunctionalitiesGrid tenantId="7" hideSmtp hideCommunication hideTopicsCard />);

        expect(screen.queryByTestId('smtp')).toBeNull();
        expect(screen.queryByTestId('communication')).toBeNull();
        expect(screen.queryByTestId('topics')).toBeNull();
        expect(tileCount(container)).toBe(1);
    });

    it('passes the hide flags on to the other-functions tile unchanged', () => {
        render(<FunctionalitiesGrid tenantId="7" hideTopicsToggle hideStatistics hideGroupChatToggle />);

        expect(JSON.parse(screen.getByTestId('other-functions').textContent ?? '{}')).toEqual({
            tenantId: '7',
            hideTopics: true,
            hideStatistics: true,
            hideGroupChatToggle: true,
        });
    });
});
