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

    it('keeps the tiles in reading order and gives the other-functions tile two columns', () => {
        const { container } = render(<FunctionalitiesGrid tenantId="7" />);
        const items = [...container.querySelectorAll<HTMLElement>('[data-admin-card-grid-item]')];

        expect(items.map((item) => item.querySelector('[data-testid]')?.getAttribute('data-testid'))).toEqual([
            'smtp',
            'communication',
            'other-functions',
            'topics',
        ]);
        expect(items.map(spanOf)).toEqual([3, 1, 2, 1]);
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
