import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, waitFor, userEvent, within } from 'storybook/test';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { DpaLegalReader } from './DpaLegalReader';
import { LONG_DPA_HTML, PHONE_390, PLAIN_DPA_HTML } from './dpaStoryText';

/**
 * The DPA/AVV reader used by both public surfaces (tenant-admin onboarding
 * step and the DPA blocker). It has NO navigation of its own: the canonical
 * read-only rich-text card provides the "Chapter Navbar" chip row
 * (`AnchorChips`, Figma 1299-81676), the fullscreen reading mode and the
 * in-text cross references. Picking a chapter scrolls inside the text region
 * and moves keyboard focus to that heading.
 */
const meta = {
    title: 'Molecules/DpaLegalReader',
    component: DpaLegalReader,
    parameters: {
        layout: 'centered',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=1299-81676',
        },
    },
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <Story />
            </ThemeProvider>
        ),
    ],
    args: { label: 'Auftragsverarbeitungsvertrag' },
} satisfies Meta<typeof DpaLegalReader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Desktop: long contract, one chip per chapter, no editing affordances. */
export const DesktopWithChapters: Story = {
    args: { html: LONG_DPA_HTML, description: 'Bitte prüfen Sie den Vertrag und bestätigen Sie ihn anschließend.' },
    decorators: [
        (Story) => (
            <div style={{ width: 'min(700px, 94vw)' }}>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(() => expect(canvasElement.querySelectorAll('[data-anchor-chip]').length).toBe(11));
        // Reader, not editor.
        await expect(canvas.queryByTestId('m3-toolbar')).not.toBeInTheDocument();

        const chip = canvasElement.querySelector<HTMLElement>(
            '[data-anchor-chip="4-pflichten-des-auftragnehmers"] .RichEditor-anchorChipLabel',
        );
        await userEvent.click(chip!);
        await waitFor(() =>
            expect(canvasElement.querySelector('#4-pflichten-des-auftragnehmers')).toBe(document.activeElement),
        );
    },
};

/** Text without headings: no empty chapter row is rendered. */
export const DesktopWithoutChapters: Story = {
    args: { html: PLAIN_DPA_HTML },
    decorators: [
        (Story) => (
            <div style={{ width: 'min(700px, 94vw)' }}>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(() => expect(canvas.getByTestId('dpa-text')).toBeVisible());
        await expect(canvasElement.querySelector('[data-anchor-chip]')).toBeNull();
    },
};

/** 390x844: the card goes fluid, the chip row scrolls sideways with its arrows. */
export const MobileWithChapters: Story = {
    args: { html: LONG_DPA_HTML },
    decorators: [
        (Story) => (
            <div style={{ width: '100%' }}>
                <Story />
            </div>
        ),
    ],
    ...PHONE_390,
    parameters: { ...PHONE_390.parameters, layout: 'padded' },
};
