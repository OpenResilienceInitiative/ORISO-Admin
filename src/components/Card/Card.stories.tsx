import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './index';

const meta = {
    title: 'Molecules/Card',
    component: Card,
    parameters: {
        layout: 'padded',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=899-26642',
        },
    },
    args: {
        titleKey: 'Allgemeine Informationen',
    },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        children: 'Karteninhalt im Admin-Panel.',
    },
};

export const WithTooltip: Story = {
    args: {
        tooltip: 'Diese Angaben werden öffentlich angezeigt.',
        children: 'Karteninhalt mit Info-Tooltip neben dem Titel.',
    },
};

export const Loading: Story = {
    args: {
        isLoading: true,
        children: 'Wird nicht angezeigt, während geladen wird.',
    },
};

export const DialogVariant: Story = {
    args: {
        variant: 'dialog',
        dialogContentPadding: true,
        children: 'Dialog-Variante mit abgerundeter Karten-Oberfläche.',
    },
};
