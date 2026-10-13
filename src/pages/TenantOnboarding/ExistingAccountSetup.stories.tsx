import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, within } from 'storybook/test';
import { http, HttpResponse } from 'msw';
import { ThemeProvider } from '@mui/material/styles';
import { publicAccountInvitesEndpoint } from '../../appConfig';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { CounsellorOnboarding } from '../CounsellorOnboarding/CounsellorOnboarding';
import { TenantAdminOnboarding } from './TenantAdminOnboarding';

type SetupRole = 'TENANT_ADMIN' | 'COUNSELLOR' | 'AGENCY_ADMIN';

const tokenFor = (role: SetupRole) => `fixture-setup-${role.toLowerCase()}`;

// Exercise the production HTTP clients, not a setup-only stub. The endpoint
// rejects any identity, role, profile or assignment supplied by the browser.
const handlersFor = (role: SetupRole) => {
    const root = `${publicAccountInvitesEndpoint}/${tokenFor(role)}`;
    return [
        http.get(`${root}/onboarding`, () =>
            HttpResponse.json({
                onboardingPurpose: 'EXISTING_ACCOUNT_SETUP',
                targetRole: role,
                recipientEmail: 'existing.account@example.org',
                firstName: null,
                lastName: null,
                tenantId: 21,
                expiresAt: null,
                dpaContent: null,
                // Setup has no reservation or topic/profile provisioning data.
            }),
        ),
        http.post(`${root}/setup`, async ({ request }) => {
            const data = await request.json();
            if (
                !data ||
                typeof data !== 'object' ||
                Object.keys(data).length !== 1 ||
                !('password' in data) ||
                data.password !== 'ChosenPass1!'
            ) {
                return HttpResponse.json({ reason: 'INVALID_SETUP_REQUEST' }, { status: 400 });
            }
            return HttpResponse.json({ phase: 'COMPLETED' });
        }),
    ];
};

const SetupFixture = ({ role }: { role: SetupRole }) =>
    role === 'TENANT_ADMIN' ? (
        <TenantAdminOnboarding inviteToken={tokenFor(role)} />
    ) : (
        <CounsellorOnboarding inviteToken={tokenFor(role)} />
    );

const meta = {
    title: 'Pages/ExistingAccountSetup',
    component: SetupFixture,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ width: 'min(700px, 94vw)', padding: '16px 0' }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    args: { role: 'TENANT_ADMIN' },
} satisfies Meta<typeof SetupFixture>;

export default meta;
type Story = StoryObj<typeof meta>;

const completePasswordSetup: NonNullable<Story['play']> = async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText(/^(Passwort|Password)$/), 'ChosenPass1!');
    await userEvent.type(canvas.getByLabelText(/^(Passwort wiederholen|Repeat password)$/), 'ChosenPass1!');
    await expect(canvas.queryByRole('checkbox')).not.toBeInTheDocument();
    await expect(canvas.queryByLabelText(/Benutzername|Username/)).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: /Passwort speichern|Save password/ }));
    await expect(await canvas.findByRole('heading', { name: /Passwort gespeichert|Password saved/ })).toBeVisible();
    await expect(canvas.getByTestId('onboarding-done-description')).toHaveTextContent(
        /Sicherheitsprüfungen|security checks/,
    );
    await expect(canvas.getByRole('button', { name: /Zum Login|Go to login|Zur Anmeldung|Sign in/ })).toBeVisible();
    await expect(canvas.queryByRole('img', { name: /QR/ })).not.toBeInTheDocument();
};

export const TenantAdmin: Story = {
    args: { role: 'TENANT_ADMIN' },
    parameters: { msw: { handlers: handlersFor('TENANT_ADMIN') } },
    play: completePasswordSetup,
};

export const Counsellor: Story = {
    args: { role: 'COUNSELLOR' },
    parameters: { msw: { handlers: handlersFor('COUNSELLOR') } },
    play: completePasswordSetup,
};

export const AgencyAdmin: Story = {
    args: { role: 'AGENCY_ADMIN' },
    parameters: { msw: { handlers: handlersFor('AGENCY_ADMIN') } },
    play: completePasswordSetup,
};
