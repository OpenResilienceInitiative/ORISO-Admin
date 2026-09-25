import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, spyOn, waitFor } from 'storybook/test';
import { PersonCell } from './PersonCell';

/**
 * Name column of the account tables. Line 1: name + "Auch …" chip. Line 2:
 * e-mail, copy button, @username. Long values are cut; the full value is in the tooltip.
 */
const meta = {
    title: 'Molecules/UserTable/PersonCell',
    component: PersonCell,
    parameters: { layout: 'padded' },
    args: { name: 'Maria Huber', email: 'maria.huber@caritas-berlin.de', username: 'mhuber' },
} satisfies Meta<typeof PersonCell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvas }) => {
        await expect(canvas.getByText('Maria Huber')).toBeVisible();
        await expect(canvas.getByText('maria.huber@caritas-berlin.de')).toBeVisible();
        const username = canvas.getByText('@mhuber');
        await expect(username).toBeVisible();
        await expect(username.getAttribute('title')).toMatch(/@mhuber/);
    },
};

/** Without a name the e-mail moves up and is shown only once. */
export const EmailOnly: Story = {
    args: { name: '' },
    play: async ({ canvas }) => {
        await expect(canvas.getAllByText('maria.huber@caritas-berlin.de')).toHaveLength(1);
    },
};

/** The "Auch …" mark sits as a small chip on the name line, not in its own column. */
export const AlsoOtherRole: Story = {
    args: { alsoLabel: 'Auch Träger-Admin' },
    play: async ({ canvas }) => {
        const chip = canvas.getByText('Auch Träger-Admin');
        const name = canvas.getByText('Maria Huber');
        await expect(chip).toBeVisible();
        await expect(chip.parentElement).toBe(name.parentElement);
    },
};

export const CopyEmail: Story = {
    play: async ({ canvas, userEvent }) => {
        const writeText = spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
        await userEvent.click(canvas.getByRole('button', { name: /E-Mail kopieren|Copy e-mail/ }));
        await waitFor(() => expect(writeText).toHaveBeenCalledWith('maria.huber@caritas-berlin.de'));
    },
};

/** In a narrow column every value stays on one line, cut with "…"; the full value is in the tooltip. */
export const NarrowColumn: Story = {
    args: {
        name: 'Dr. Maria-Theresia Huber-Oberndorfer',
        email: 'anna.muster@beratung-example.org',
        username: 'maria-theresia.huber-oberndorfer',
        alsoLabel: 'Auch Berater*in',
    },
    decorators: [
        (Story) => (
            <div style={{ width: 220 }}>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvas }) => {
        const cut = (element: HTMLElement) => element.scrollWidth > element.clientWidth;
        const name = canvas.getByText('Dr. Maria-Theresia Huber-Oberndorfer');
        const email = canvas.getByText('anna.muster@beratung-example.org');
        const username = canvas.getByText('@maria-theresia.huber-oberndorfer');

        await expect(name).toHaveAttribute('title', 'Dr. Maria-Theresia Huber-Oberndorfer');
        await expect(email).toHaveAttribute('title', 'anna.muster@beratung-example.org');
        await expect(username.getAttribute('title')).toMatch(/@maria-theresia\.huber-oberndorfer/);
        await expect(cut(name)).toBe(true);
        await expect(cut(email) || cut(username)).toBe(true);
        await expect(email.getBoundingClientRect().height).toBeLessThanOrEqual(16);
        // The chip and the copy button never shrink away.
        await expect(canvas.getByText('Auch Berater*in')).toBeVisible();
        await expect(canvas.getByRole('button', { name: /E-Mail kopieren|Copy e-mail/ })).toBeVisible();
    },
};
