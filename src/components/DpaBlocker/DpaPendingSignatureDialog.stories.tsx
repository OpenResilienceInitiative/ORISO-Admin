import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { PHONE_390 } from '../DpaLegalForm/dpaStoryText';
import { DpaPendingSignatureDialog } from './DpaPendingSignatureDialog';
import { DpaForwardOutcome } from '../../api/tenantOnboarding/dpaForward';

const LINK = {
    signUrl: 'https://app.oriso-dev.site/dpa-sign/3f2c6d1e-8b1a-4b8e-9f47-demoforward',
    expiresAt: '2026-08-29T14:31:07',
};

const wait = (ms: number) =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });

/**
 * Friendly recurring pending-signature dialog (#724, epic #722): shown on
 * each login while the DPA signature is pending after a forward — instead of
 * the hard DpaBlocker dead end. It mints a shareable sign link on open (there
 * is no "read the active link" endpoint; every issued link stays valid until a
 * signature lands), offers a re-send through the shared forward dialog (#723),
 * and "Später" to work on non-legal data.
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
        ensureSignLink: async () => {
            await wait(300);
            return LINK;
        },
        // Annotated for the same reason as in DpaForwardDialog.stories.tsx:
        // keep `mailFailed` a boolean rather than this literal `false`.
        forward: async (): Promise<DpaForwardOutcome> => {
            await wait(400);
            return { link: LINK, mailFailed: false };
        },
        onDismiss: () => {},
        onForwardCompleted: () => {},
    },
} satisfies Meta<typeof DpaPendingSignatureDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Status, the freshly minted copyable link, and both actions. */
export const Default: Story = {};

/** The same dialog at 390×844 — link, copy and both actions stay reachable. */
export const Mobile: Story = {
    ...PHONE_390,
};

/**
 * The link could not be minted. Not a dead end: "E-Mail senden" still opens
 * the forward dialog, which mints one of its own.
 */
export const LinkUnavailable: Story = {
    args: {
        ensureSignLink: async () => {
            await wait(300);
            throw new Error('CATCH_ALL');
        },
    },
};
