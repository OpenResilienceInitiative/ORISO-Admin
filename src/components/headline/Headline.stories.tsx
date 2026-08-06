import type { Meta, StoryObj } from '@storybook/react-vite';
import { Headline } from './Headline';

const meta = {
    title: 'Atoms/Headline',
    component: Headline,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof Headline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Level1: Story = {
    args: { text: 'Beratungsstellen verwalten', semanticLevel: '1' },
};

export const Level2: Story = {
    args: { text: 'Allgemeine Einstellungen', semanticLevel: '2' },
};

export const Level3: Story = {
    args: { text: 'Träger-Administratoren', semanticLevel: '3' },
};
