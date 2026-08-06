import type { Meta, StoryObj } from '@storybook/react-vite';
import SiteFooter from './SiteFooter';

/**
 * The site footer menu. Until #594.15b every entry was dead — antd items with a
 * label, a placeholder key (`item-1`, `split`, `submenu`) and no handler — so
 * clicking Imprint or Privacy did nothing. Both now open their own dialog
 * through the shared M3 Modal, the `' | '` pseudo-item is gone (a separator is
 * styling, not a focusable menu entry) and the keys are meaningful.
 */
const meta = {
    title: 'Molecules/SiteFooter',
    component: SiteFooter,
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SiteFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

/** In-flow footer: protected layout and the public pages without a stage panel. */
export const Default: Story = {};

/**
 * Public sign-in/sign-up surface: the same menu with the language selector as a
 * third entry, pinned to the bottom left of the dark stage panel and rendered
 * in white. Shown here on a stand-in panel; the real placement is in
 * `Pages/Login/PublicSurface`.
 */
export const OnStagePanel: Story = {
    args: { variant: 'stage' },
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            // Stand-in for the stage panel: same token, same 40vw footprint, so
            // the fixed desktop placement lands where it does on the real page.
            <div style={{ width: '40vw', height: '100vh', background: 'var(--m3-on-background)' }}>
                <Story />
            </div>
        ),
    ],
};
