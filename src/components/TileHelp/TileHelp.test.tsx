import '@ant-design/v5-patch-for-react-19';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vite-plus/test';
import { TileHelpButton, type TileHelpTopic } from '.';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        i18n: { language: 'de' },
        t: (key: string, options?: { current?: number; total?: number }) =>
            options?.current ? `${key} ${options.current}/${options.total}` : key,
    }),
}));

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => undefined,
            removeListener: () => undefined,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            dispatchEvent: () => false,
        }),
    });
});

const topic: TileHelpTopic = {
    id: 'duplicate',
    titleKey: 'topic.title',
    essenceKey: 'topic.essence',
    slides: [
        { id: 'one', titleKey: 'one.title', bodyKey: 'one.body', visual: <img src="one.webp" alt="" /> },
        { id: 'two', titleKey: 'two.title', bodyKey: 'two.body' },
        { id: 'three', titleKey: 'three.title', bodyKey: 'three.body' },
    ],
};

const openHelp = async () => {
    render(<TileHelpButton topic={topic} tileTitle="Tile" tileIcon={<svg data-testid="tile-icon" />} />);
    await userEvent.click(screen.getByRole('button', { name: 'tileHelp.open' }));
    return screen.getByRole('dialog');
};

const media = (dialog: HTMLElement) => dialog.querySelector<HTMLElement>('[data-tile-help-media]');

describe('TileHelp dialog', () => {
    it('shows the tile icon in the header so the explanation visibly belongs to the tile', async () => {
        const dialog = await openHelp();

        const headerIcon = dialog.querySelector('[data-tile-help-icon]');
        expect(headerIcon).toHaveAttribute('aria-hidden');
        expect(within(headerIcon as HTMLElement).getByTestId('tile-icon')).toBeInTheDocument();
        expect(within(dialog).getByText('topic.title')).toBeInTheDocument();
    });

    it('keeps the picture box on every step and stands the tile icon in for a missing drawing', async () => {
        const dialog = await openHelp();

        expect(media(dialog)).toHaveAttribute('data-tile-help-media', 'visual');
        expect(media(dialog)?.querySelector('img')).not.toBeNull();

        await userEvent.click(within(dialog).getByRole('button', { name: 'tileHelp.next' }));
        expect(within(dialog).getByText('two.title')).toBeInTheDocument();
        expect(media(dialog)).toHaveAttribute('data-tile-help-media', 'placeholder');
        expect(media(dialog)).toHaveAttribute('aria-hidden');
        expect(within(media(dialog) as HTMLElement).getByTestId('tile-icon')).toBeInTheDocument();

        await userEvent.click(within(dialog).getByRole('button', { name: 'tileHelp.next' }));
        expect(within(dialog).getByText('tileHelp.progress 3/3')).toBeInTheDocument();
        expect(media(dialog)).toHaveAttribute('data-tile-help-media', 'placeholder');
    });

    it('still moves through the steps with the arrow keys', async () => {
        const dialog = await openHelp();

        const slide = dialog.querySelector('[data-tile-help-slide]') as HTMLElement;
        fireEvent.keyDown(slide, { key: 'ArrowRight' });
        expect(within(dialog).getByText('two.title')).toBeInTheDocument();
        fireEvent.keyDown(slide, { key: 'ArrowLeft' });
        expect(within(dialog).getByText('one.title')).toBeInTheDocument();
    });
});
