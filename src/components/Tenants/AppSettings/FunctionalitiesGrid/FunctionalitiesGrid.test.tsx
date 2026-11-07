import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';

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

// eslint-disable-next-line import/first
import { FunctionalitiesGrid } from './index';

const tileCount = (container: HTMLElement) => container.querySelectorAll('[data-admin-card-grid-item]').length;

describe('FunctionalitiesGrid', () => {
    it('lays every tile into the settings raster, one grid item each', () => {
        const { container } = render(<FunctionalitiesGrid tenantId="7" />);

        expect(screen.getByTestId('smtp')).toHaveTextContent('7');
        expect(screen.getByTestId('communication')).toHaveTextContent('7');
        expect(screen.getByTestId('other-functions')).toBeInTheDocument();
        expect(tileCount(container)).toBe(3);
        // The old layout was an antd Row/Col stack; the raster must not fall back to it.
        expect(container.querySelector('.ant-row')).toBeNull();
    });

    it('drops the tiles a level hides', () => {
        const { container } = render(<FunctionalitiesGrid tenantId="7" hideSmtp hideCommunication />);

        expect(screen.queryByTestId('smtp')).toBeNull();
        expect(screen.queryByTestId('communication')).toBeNull();
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
