import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export is not resolved by ESLint.
import { expect, userEvent, within } from 'storybook/test';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { CollapsibleTile } from './index';

const meta = {
    title: 'Molecules/CollapsibleTile',
    component: CollapsibleTile,
    parameters: { layout: 'padded' },
    args: {
        icon: <DescriptionOutlinedIcon />,
        title: 'Impressum der Beratungsstelle',
        status: 'Veröffentlicht',
        children: <p style={{ margin: 0, padding: 16 }}>Der Inhalt der Kachel, zum Beispiel ein Dokument-Editor.</p>,
    },
} satisfies Meta<typeof CollapsibleTile>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Folded up: icon, title, state and chevron. The body is not even mounted yet. */
export const Closed: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const header = canvas.getByRole('button', { name: /Impressum der Beratungsstelle/ });
        await expect(header).toHaveAttribute('aria-expanded', 'false');
        await expect(canvas.queryByText(/Der Inhalt der Kachel/)).toBeNull();
        await userEvent.click(header);
        await expect(header).toHaveAttribute('aria-expanded', 'true');
        await expect(canvas.getByText(/Der Inhalt der Kachel/)).toBeVisible();
    },
};

export const Open: Story = { args: { defaultOpen: true } };

/** The state chip turns red when something is missing. */
export const NeedsAttention: Story = { args: { status: 'Noch leer', statusTone: 'attention' } };

export const WithoutStatus: Story = { args: { status: undefined } };

export const LongTitle: Story = {
    args: { title: 'Kontaktdaten Verantwortlicher für die Datenverarbeitung der Beratungsstelle', defaultOpen: true },
    globals: { viewport: { value: 'phone', isRotated: false } },
};

const box = (element: Element | null) => {
    if (!element) throw new Error('missing element');
    return element.getBoundingClientRect();
};

/**
 * The designed fold (Frank, 2026-11-24): open, the icon sits centred above the title like on every
 * tile; folded, it slides to the left of the title into one row. With reduced motion it just jumps.
 */
export const IconSlidesWhenFolding: Story = {
    args: { defaultOpen: true },
    play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);
        const header = canvas.getByRole('button', { name: /Impressum der Beratungsstelle/ });
        const icon = () => canvasElement.querySelector('[data-collapsible-tile-icon]');
        const title = () => canvasElement.querySelector('[data-collapsible-tile-title]');
        const settle = () =>
            new Promise((resolve) => {
                setTimeout(resolve, 400);
            });

        await step('open: icon centred above the title', async () => {
            await expect(box(icon()).bottom).toBeLessThanOrEqual(box(title()).top + 1);
            const iconCentre = box(icon()).left + box(icon()).width / 2;
            const titleCentre = box(title()).left + box(title()).width / 2;
            await expect(Math.abs(iconCentre - titleCentre)).toBeLessThan(4);
        });

        await step('folded: icon left of the title, in one row', async () => {
            await userEvent.click(header);
            await settle();
            await expect(header).toHaveAttribute('aria-expanded', 'false');
            await expect(box(icon()).right).toBeLessThanOrEqual(box(title()).left);
            await expect(
                Math.abs(box(icon()).top + box(icon()).height / 2 - (box(title()).top + box(title()).height / 2)),
            ).toBeLessThan(8);
        });

        await step('open again: back on top', async () => {
            await userEvent.click(header);
            await settle();
            await expect(box(icon()).bottom).toBeLessThanOrEqual(box(title()).top + 1);
        });
    },
};
