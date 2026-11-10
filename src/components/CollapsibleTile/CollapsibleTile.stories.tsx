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
    parameters: { viewport: { defaultViewport: 'phone' } },
};
