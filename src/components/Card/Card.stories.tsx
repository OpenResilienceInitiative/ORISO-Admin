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

/** Wizard skeleton: header icon + Headline Small title (Figma 24/32/400) + body slot
 *  + footer action row (top divider, right-aligned text buttons). Every Counsellor-
 *  Setup-Wizard step is this skeleton with a different body. */
export const WizardSkeleton: Story = {
    args: {
        headerIcon: '🛡',
        titleKey: 'Advisor Account Data',
        children: 'Body slot — fields, chips, toggles, etc. go here per step.',
        footer: (
            <>
                <button
                    type="button"
                    style={{
                        border: 0,
                        background: 'transparent',
                        color: 'var(--m3-primary, #a5000a)',
                        fontWeight: 500,
                        cursor: 'pointer',
                    }}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    style={{
                        border: 0,
                        background: 'transparent',
                        color: 'var(--m3-primary, #a5000a)',
                        fontWeight: 500,
                        cursor: 'pointer',
                    }}
                >
                    Next
                </button>
            </>
        ),
    },
};
