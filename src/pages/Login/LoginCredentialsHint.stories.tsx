import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { LoginCredentialsHint } from './LoginCredentialsHint';

/**
 * TEN-INV-U10 (#572): the ONE combined, privacy-preserving login failure
 * hint. Invalid credentials and a not-yet-registered invitee both get this
 * exact text (check credentials, or finish the invitation link first) so the
 * form cannot be used to enumerate accounts. Distinct from the post-login
 * DPA blocker, which only appears AFTER successful authentication.
 */
const meta = {
    title: 'Molecules/LoginCredentialsHint',
    component: LoginCredentialsHint,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ width: 'min(400px, 92vw)' }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
} satisfies Meta<typeof LoginCredentialsHint>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The combined hint shown inline under the login fields on auth failure. */
export const AuthFailureHint: Story = {};

/** Same hint at the 390x844 mobile viewport. */
export const AuthFailureHintMobile: Story = {
    parameters: {
        viewport: {
            options: {
                phone390: { name: 'Phone 390×844', styles: { width: '390px', height: '844px' } },
            },
        },
    },
    globals: { viewport: { value: 'phone390', isRotated: false } },
};
