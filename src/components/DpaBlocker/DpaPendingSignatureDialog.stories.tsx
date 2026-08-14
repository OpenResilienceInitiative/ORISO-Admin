import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { PHONE_390 } from '../DpaLegalForm/dpaStoryText';
import { DpaPendingSignatureDialog } from './DpaPendingSignatureDialog';

const ACTIVE_FORWARD = {
    signLink: 'https://app.oriso-dev.site/dpa-sign/3f2c6d1e-8b1a-4b8e-9f47-demoforward',
    expiresAt: '2099-01-01T00:00:00Z',
    recipientEmail: 'legal@example.org',
};

const wait = (ms: number) =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });

/**
 * Friendly recurring pending-signature dialog (#724, epic #722): shown on
 * each login while the DPA signature is pending after an explicit forward —
 * instead of the hard DpaBlocker dead end. Copyable sign link, re-send via
 * the shared forward dialog (#723), and "Später" to work on non-legal data.
 * "E-Mail senden" switches to the shared forward dialog.
 */
const meta = {
    title: 'Organisms/DpaBlocker/PendingSignatureDialog',
    component: DpaPendingSignatureDialog,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <Story />
            </ThemeProvider>
        ),
    ],
    args: {
        forward: ACTIVE_FORWARD,
        ensureSignLink: async () => {
            await wait(300);
            return { signLink: ACTIVE_FORWARD.signLink, expiresAt: ACTIVE_FORWARD.expiresAt };
        },
        sendEmail: async () => {
            await wait(600);
        },
        onDismiss: () => {},
        onForwardCompleted: () => {},
    },
} satisfies Meta<typeof DpaPendingSignatureDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Active link: status, copyable link, recipient of the last mail, dismiss. */
export const Default: Story = {};

/** The same dialog at 390×844 — link, copy and both actions stay reachable. */
export const Mobile: Story = {
    ...PHONE_390,
};

/** The link expired: fresh-link hint instead of the dead link. */
export const Expired: Story = {
    args: {
        forward: { ...ACTIVE_FORWARD, expiresAt: '2020-01-01T00:00:00Z' },
    },
};

/** No mail was ever sent — the link was shared manually. */
export const LinkOnlyShared: Story = {
    args: {
        forward: { ...ACTIVE_FORWARD, recipientEmail: null },
    },
};
