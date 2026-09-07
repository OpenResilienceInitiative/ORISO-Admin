import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { MandatoryTwoFactorSetup } from './MandatoryTwoFactorSetup';

/**
 * The screen a gated administrator sees instead of the admin area (#891).
 *
 * Tenant- and agency-admins without an active second factor get this in place
 * of every route, so the states worth reviewing are exactly the ones an admin
 * can be stuck in: enrolment available, and enrolment unavailable because the
 * account has no 2FA capability at all.
 *
 * There is no "skip" story because there is no skip: the only ways off this
 * screen are completing enrolment or logging out through the sidebar.
 */
const meta = {
    title: 'Pages/MandatoryTwoFactorSetup',
    component: MandatoryTwoFactorSetup,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => {
            // The enrolment wizard renders through a portal into #overlay.
            if (!document.getElementById('overlay')) {
                const overlayRoot = document.createElement('div');
                overlayRoot.id = 'overlay';
                document.body.appendChild(overlayRoot);
            }
            return (
                <ThemeProvider theme={orisoMuiTheme}>
                    <Story />
                </ThemeProvider>
            );
        },
    ],
} satisfies Meta<typeof MandatoryTwoFactorSetup>;

export default meta;
type Story = StoryObj<typeof meta>;

const userData = (twoFactorAuth: Record<string, unknown>) => ({
    email: 'traeger.admin@example.org',
    firstname: 'Erika',
    lastname: 'Beispiel',
    username: 'traeger-admin',
    twoFactorAuth,
});

const withUserData = (twoFactorAuth: Record<string, unknown>) => ({
    msw: {
        handlers: [http.get('*/service/users/data', () => HttpResponse.json(userData(twoFactorAuth)))],
    },
});

/** The ordinary case: a Träger-Admin who has not enrolled yet. */
export const EnrolmentRequired: Story = {
    parameters: withUserData({
        isEnabled: true,
        isActive: false,
        isToEncourage: true,
        qrCode: '',
        secret: 'stub-secret',
        type: 'APP',
    }),
};

/**
 * 2FA is switched off for the account's realm role, so the admin cannot enrol
 * and cannot get in either. The error tells them that rather than leaving them
 * on a switch that does nothing.
 */
export const EnrolmentUnavailable: Story = {
    parameters: withUserData({
        isEnabled: false,
        isActive: false,
        isToEncourage: false,
        qrCode: '',
        secret: '',
        type: 'APP',
    }),
};

/**
 * 320px, the narrowest width the issue's test plan asks the setup to stay
 * usable at. The wider 412px case is covered by the toolbar's Phone 390 /
 * Tablet 768 options on the story above.
 */
export const Narrow320: Story = {
    ...EnrolmentRequired,
    globals: { viewport: { value: 'width320', isRotated: false } },
    parameters: {
        ...EnrolmentRequired.parameters,
        viewport: {
            // 320 is not one of the project's standard device widths
            // (.storybook/preview.tsx) — the ticket names it explicitly.
            options: { width320: { name: 'Issue 320', styles: { width: '320px', height: '740px' } } },
        },
    },
};
