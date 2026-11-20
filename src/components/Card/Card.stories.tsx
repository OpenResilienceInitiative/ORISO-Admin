import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { expect } from 'storybook/test';
import { Card } from './index';
import { M3Button } from '../M3Button';

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

/** Dialog variant + footer — the Neu-Träger create card: divider spans the
 *  card, actions are inset M3 text buttons (no more loose page-bottom buttons). */
export const DialogWithFooter: Story = {
    args: {
        variant: 'dialog',
        dialogContentPadding: true,
        autoHeight: true,
        titleKey: 'Träger-Admin',
        children: 'Card body — admin credential fields go here.',
        footer: (
            <>
                <M3Button>Abbrechen</M3Button>
                <M3Button>Speichern</M3Button>
            </>
        ),
    },
};

/** The info button sits in the corner of the card it belongs to, in the default variant too (#1329). */
export const DefaultWithHelp: Story = {
    args: {
        dataTestId: 'card-with-help',
        children: 'Karteninhalt im Admin-Panel.',
        help: { id: 'story', titleKey: 'Allgemeine Informationen', essenceKey: 'Kurz erklärt', slides: [] },
    },
    decorators: [
        (Story) => (
            <div style={{ width: 400, marginLeft: 200 }}>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        const card = canvasElement.querySelector('[data-testid="card-with-help"]') as HTMLElement;
        const button = card.querySelector('button') as HTMLElement;
        const cardBox = card.getBoundingClientRect();
        const buttonBox = button.getBoundingClientRect();
        await expect(buttonBox.right).toBeLessThanOrEqual(cardBox.right);
        await expect(buttonBox.top).toBeGreaterThanOrEqual(cardBox.top);
        await expect(buttonBox.bottom).toBeLessThanOrEqual(cardBox.bottom);
    },
};
