import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import type { TileHelpTopic } from '../../../../TileHelp';
import { LegalDocumentTile } from './index';

const helpButtonProps = vi.hoisted(() => ({ last: undefined as Record<string, unknown> | undefined }));

// The real button, wrapped so the test can see what the tile hands to it.
vi.mock('../../../../TileHelp', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../../TileHelp')>();
    return {
        ...actual,
        TileHelpButton: (props: Parameters<typeof actual.TileHelpButton>[0]) => {
            helpButtonProps.last = props as unknown as Record<string, unknown>;
            return <actual.TileHelpButton {...props} />;
        },
    };
});

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: { title?: string }) => (options?.title ? `${key} ${options.title}` : key),
    }),
}));

const topic: TileHelpTopic = {
    id: 'imprint',
    titleKey: 'imprint.help.title',
    essenceKey: 'imprint.help.essence',
    slides: [],
};
const Icon = () => <svg data-testid="tile-icon" />;

const renderTile = (
    props: { help?: TileHelpTopic; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void } = { help: topic },
) =>
    render(
        <LegalDocumentTile
            icon={Icon}
            title="Impressum"
            status={{ label: 'Noch leer', tone: 'attention' }}
            intro={<p>Wer darf was bearbeiten</p>}
            {...props}
        >
            <div>Editor</div>
        </LegalDocumentTile>,
    );

const helpButton = () => screen.queryByRole('button', { name: 'tileHelp.open Impressum' });

/** The tile help (i) lives in the unfolded content only, never in the folded header. */
describe('LegalDocumentTile', () => {
    it('shows icon, title and state in the folded header, and nothing else', () => {
        renderTile();

        expect(screen.getByRole('button', { name: /Impressum.*Noch leer/ })).toHaveAttribute('aria-expanded', 'false');
        expect(screen.getByTestId('tile-icon')).toBeInTheDocument();
        expect(helpButton()).toBeNull();
        expect(screen.queryByText('Wer darf was bearbeiten')).toBeNull();
        expect(screen.queryByText('Editor')).toBeNull();
    });

    it('puts the explanation button and the help text at the top of the unfolded content', async () => {
        renderTile();

        await userEvent.click(screen.getByRole('button', { name: /Impressum/ }));

        expect(helpButton()).toBeInTheDocument();
        expect(screen.getByText('Wer darf was bearbeiten')).toBeVisible();
        expect(screen.getByText('Editor')).toBeVisible();
    });

    it('never puts the explanation button into the header', async () => {
        renderTile({ help: topic, defaultOpen: true });

        expect(helpButton()).toBeInTheDocument();
        expect(
            within(screen.getByRole('heading', { level: 3 })).queryByRole('button', { name: /tileHelp/ }),
        ).toBeNull();
    });

    it('has no explanation button when the tile has no explanation', async () => {
        renderTile({ defaultOpen: true });

        expect(helpButton()).toBeNull();
        expect(screen.getByText('Wer darf was bearbeiten')).toBeVisible();
    });

    it('hands the tile icon over to the explanation button (shown once TileHelpButton takes it)', () => {
        renderTile({ help: topic, defaultOpen: true });

        const tileIcon = helpButtonProps.last?.tileIcon as React.ReactElement;
        expect(tileIcon.type).toBe(Icon);
        expect(helpButtonProps.last).toMatchObject({ topic, tileTitle: 'Impressum' });
    });

    it('reports a fold or unfold of the tile to its parent', async () => {
        const onOpenChange = vi.fn();
        renderTile({ help: topic, onOpenChange });

        await userEvent.click(screen.getByRole('button', { name: /Impressum/ }));

        expect(onOpenChange).toHaveBeenCalledWith(true);
    });
});
