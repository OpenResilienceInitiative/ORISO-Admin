import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, fn, userEvent, within } from 'storybook/test';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { CardGrid } from '../../CardGrid';
import { walkThroughTileHelp } from '../../TileHelp/tileHelpStory.matrix';
import { TopicDuplicateSettingsCard } from '.';

/** ORISO-Frontend#1876: only "inform the existing counsellor once" is live; the rest come with #1878. */
const meta = {
    title: 'Organisms/GlobalSettings/TopicDuplicateSettingsCard',
    component: TopicDuplicateSettingsCard,
    decorators: [
        (Story, { parameters }) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ maxWidth: parameters.tileWidth ?? 400 }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    args: { isLoading: false, onSave: fn() },
} satisfies Meta<typeof TopicDuplicateSettingsCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Zwei Beratungen zum gleichen Thema')).toBeVisible();
        await expect(canvas.getByRole('radio', { name: 'Bisherige Berater:in einmal informieren' })).toBeChecked();
    },
};

export const Editing: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /edit|bearbeiten/i }));
        const radios = canvas.getAllByRole('radio');
        await expect(radios).toHaveLength(4);
        await expect(radios[0]).toBeEnabled();
        await Promise.all(radios.slice(1).map((radio) => expect(radio).toBeDisabled()));
    },
};

/** ORISO rule: superadmin-only settings are visible-but-disabled for everyone else. */
export const DisabledForNonSuperadmins: Story = {
    args: { disabled: true },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('radio', { name: 'Bisherige Berater:in einmal informieren' })).toBeDisabled();
        await expect(canvas.queryByRole('button', { name: /edit|bearbeiten/i })).toBeNull();
    },
};

/** As it sits on the page, beside a taller tile, so the free space shows. */
export const InTheRaster: Story = {
    parameters: { tileWidth: 'none' },
    render: (args) => (
        <CardGrid raster>
            <CardGrid.Item>
                <TopicDuplicateSettingsCard {...args} />
            </CardGrid.Item>
            <CardGrid.Item>
                <div style={{ height: 720 }} />
            </CardGrid.Item>
        </CardGrid>
    ),
};

/** The explanation behind the info button, one slide after the other. */
export const HelpSlideshow: Story = {
    ...InTheRaster,
    play: async ({ canvasElement }) => walkThroughTileHelp(canvasElement, 3),
};

/**
 * Only the first slide has a drawing. The picture box keeps its height on every step (the tile
 * icon stands in), so Weiter does not jump while clicking through; the header shows the tile icon.
 */
export const HelpKeepsItsGeometry: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(canvas.getByRole('button', { name: /erklärung öffnen|open explanation/i }));
        const dialog = await body.findByRole('dialog');
        await expect(dialog.querySelector('[data-tile-help-icon] svg')).not.toBeNull();

        // Layout sizes, not getBoundingClientRect: the dialog's zoom-in animation
        // scales the box (0.2 → 1) and would make the first frames look smaller.
        const offsetTopWithin = (element: HTMLElement) => {
            let top = 0;
            let node: HTMLElement | null = element;
            while (node && node !== dialog) {
                top += node.offsetTop;
                node = node.offsetParent as HTMLElement | null;
            }
            return top;
        };
        const measure = () => ({
            media: (dialog.querySelector('[data-tile-help-media]') as HTMLElement).offsetHeight,
            next: offsetTopWithin(
                within(dialog).getByRole('button', { name: /^(weiter|next|fertig|done)$/i }) as HTMLElement,
            ),
        });
        const first = measure();
        await expect(dialog.querySelector('[data-tile-help-media="visual"] img')).not.toBeNull();
        for (let step = 2; step <= 3; step += 1) {
            // eslint-disable-next-line no-await-in-loop -- the slides follow one another.
            await userEvent.click(within(dialog).getByRole('button', { name: /^(weiter|next)$/i }));
            // eslint-disable-next-line no-await-in-loop
            await expect(dialog.querySelector('[data-tile-help-media="placeholder"] svg')).not.toBeNull();
            const current = measure();
            // eslint-disable-next-line no-await-in-loop
            await expect(current.media).toBe(first.media);
            // eslint-disable-next-line no-await-in-loop
            await expect(Math.abs(current.next - first.next)).toBeLessThan(1);
        }
    },
};
