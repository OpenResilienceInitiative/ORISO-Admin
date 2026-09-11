import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { PHONE_390 } from '../DpaLegalForm/dpaStoryText';
import { DpaUnlockDialog } from './DpaUnlockDialog';

/**
 * The signature landed while the tenant admin was waiting on the pending-
 * signature gate (JOB8). The platform is NOT opened silently: the tenant
 * confirms with "Plattform freischalten", and that click re-asks the backend
 * for the signature state before anything behind the gate renders (JOB9).
 * Logout stays available for as long as the gate is up.
 */
const meta = {
    title: 'Organisms/DpaBlocker/UnlockDialog',
    component: DpaUnlockDialog,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <Story />
            </ThemeProvider>
        ),
    ],
    args: {
        onUnlock: () => {},
        onLogout: () => {},
    },
} satisfies Meta<typeof DpaUnlockDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The success state with both exits. */
export const Default: Story = {};

/** The re-check is in flight — the action is busy, the gate is still closed. */
export const Verifying: Story = {
    args: { checking: true },
};

/** The same gate at 390×844. */
export const Mobile: Story = {
    ...PHONE_390,
};
