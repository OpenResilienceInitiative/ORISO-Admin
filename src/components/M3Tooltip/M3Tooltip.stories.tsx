/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- fixtures: a tooltip on non-interactive text is exactly what is under test */
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { expect, within } from 'storybook/test';
import { FilterChip } from '../FilterChip';
import { M3Tooltip } from './index';

const meta = {
    title: 'Atoms/M3Tooltip',
    component: M3Tooltip,
    parameters: { layout: 'centered' },
    args: {
        text: 'Diese Einladung wurde durch ein erneutes Versenden ersetzt — es gilt die neuere Einladung.',
        children: <span tabIndex={0}>Ersetzt</span>,
    },
} satisfies Meta<typeof M3Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hover or tab to the trigger; Escape dismisses (WCAG 2.2 SC 1.4.13). */
export const PlainTooltip: Story = {};

export const BelowTheTrigger: Story = { args: { placement: 'bottom' } };

/** How the invite board uses it: the status vocabulary explains itself (C3). */
export const OnAFilterChip: StoryObj = {
    render: () => (
        <FilterChip
            label="Ersetzt"
            tooltip="Diese Einladung wurde durch ein erneutes Versenden ersetzt — es gilt die neuere Einladung."
        />
    ),
};

/** Empty text is a no-op: the trigger renders untouched, no bubble, no aria. */
export const WithoutText: Story = { args: { text: '' } };

/** `portal`: the bubble escapes a horizontally scrolling row that would clip it. */
export const InClippingRow: StoryObj = {
    render: () => (
        <div style={{ overflowX: 'auto', overflowY: 'hidden', padding: 8, width: 320 }}>
            <M3Tooltip placement="bottom" portal text="Kommt bald">
                <span tabIndex={0}>Rolle</span>
            </M3Tooltip>
        </div>
    ),
};

const LONG_REASON = 'Nur Plattform-Admins können geteilte Vorlagen ändern. Legen Sie eine eigene Vorlage an.';

/** Focuses the trigger and checks that the portal bubble stays fully on screen. */
const expectBubbleOnScreen = async (canvasElement: HTMLElement) => {
    within(canvasElement).getByText('Sperre').focus();
    const bubble = await within(canvasElement.ownerDocument.body).findByRole('tooltip');
    const rect = bubble.getBoundingClientRect();
    const view = canvasElement.ownerDocument.defaultView as Window;
    await expect(rect.top).toBeGreaterThanOrEqual(0);
    await expect(rect.left).toBeGreaterThanOrEqual(0);
    await expect(rect.bottom).toBeLessThanOrEqual(view.innerHeight);
    await expect(rect.right).toBeLessThanOrEqual(view.innerWidth);
};

/** `portal` at the top edge: no room above, so the bubble opens below instead of leaving the screen. */
export const PortalAtTopEdge: StoryObj = {
    parameters: { layout: 'fullscreen' },
    render: () => (
        <div style={{ position: 'fixed', top: 0, left: 200 }}>
            <M3Tooltip portal text={LONG_REASON}>
                <span tabIndex={0}>Sperre</span>
            </M3Tooltip>
        </div>
    ),
    play: async ({ canvasElement }) => expectBubbleOnScreen(canvasElement),
};

/** `portal` at the right edge: the bubble shifts left to stay readable. */
export const PortalAtRightEdge: StoryObj = {
    parameters: { layout: 'fullscreen' },
    render: () => (
        <div style={{ position: 'fixed', top: 120, right: 0 }}>
            <M3Tooltip portal text={LONG_REASON}>
                <span tabIndex={0}>Sperre</span>
            </M3Tooltip>
        </div>
    ),
    play: async ({ canvasElement }) => expectBubbleOnScreen(canvasElement),
};
