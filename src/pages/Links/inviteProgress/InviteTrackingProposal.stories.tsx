import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- valid package export; the repository resolver predates exports maps
import { expect, userEvent, within } from 'storybook/test';
import { InviteTrackingProposal } from './InviteTrackingProposal';

const meta = {
    title: 'Proposals/Invitations/Truthful tracking',
    component: InviteTrackingProposal,
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component:
                    'Design-only proposal for #1136 / #1026. Explicit synthetic fixtures preserve reached events, distinguish account creation from existing-account assignment and password setup, and separate role edits from explicit sends. Closed-history grouping is a proposal. No services, real roles or emails are changed.',
            },
        },
        viewport: {
            options: {
                proposalPhone: { name: 'Phone 390', styles: { width: '390px', height: '844px' } },
                proposalTablet: { name: 'Tablet 820', styles: { width: '820px', height: '1180px' } },
                proposalDesktop: { name: 'Desktop 1440', styles: { width: '1440px', height: '900px' } },
                proposalSmall: { name: 'Small phone 320', styles: { width: '320px', height: '740px' } },
                proposalLarge: { name: 'Large phone 412', styles: { width: '412px', height: '915px' } },
            },
        },
    },
    args: { locale: 'de', initialView: 'active' },
} satisfies Meta<typeof InviteTrackingProposal>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = { globals: { viewport: { value: 'proposalDesktop', isRotated: false } } };
export const Mobile: Story = { globals: { viewport: { value: 'proposalPhone', isRotated: false } } };
export const Tablet: Story = { globals: { viewport: { value: 'proposalTablet', isRotated: false } } };
export const English: Story = { args: { locale: 'en' } };
export const SmallPhoneEnglish: Story = {
    args: { locale: 'en', initialView: 'history' },
    globals: { viewport: { value: 'proposalSmall', isRotated: false } },
};
export const LargePhone: Story = { globals: { viewport: { value: 'proposalLarge', isRotated: false } } };
export const ClosedHistory: Story = {
    args: { initialView: 'history' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const row = within(canvas.getByRole('article', { name: 'Frida Beispiel · INV-204' }));
        await userEvent.click(row.getByRole('button', { name: 'Ersetzt · Erklärung' }));
        await expect(row.getByRole('note')).toHaveTextContent('Diese Einladung ist geschlossen');
        await expect(row.getByRole('button', { name: /Konto angelegt · Erreicht/ })).toBeVisible();
        await expect(row.getAllByText('30.09., 22:12')).toHaveLength(2);
        await userEvent.keyboard('{Escape}');
        await expect(row.queryByRole('note')).not.toBeInTheDocument();
    },
};
export const RoleAndExplicitResend: Story = {
    args: { onlyStatus: 'sent' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const row = within(canvas.getByRole('article', { name: 'Frida Beispiel · INV-205' }));
        await userEvent.selectOptions(row.getByRole('combobox', { name: 'Rolle' }), 'admin');
        await expect(canvas.getByRole('status')).toHaveTextContent('Es wurde keine E-Mail gesendet');
        await userEvent.click(row.getByRole('button', { name: 'Erneut senden' }));
        await expect(canvas.getByRole('status')).toHaveTextContent('eine ausdrückliche Aktion');
    },
};
export const Draft: Story = { args: { onlyStatus: 'draft' } };
export const AccountCreated: Story = { args: { onlyStatus: 'created' } };
export const ExistingAccountAssignment: Story = { args: { onlyStatus: 'done' } };
export const Revoked: Story = { args: { onlyStatus: 'revoked', initialView: 'history' } };
export const Expired: Story = { args: { onlyStatus: 'expired' } };
export const DeliveryFailure: Story = { args: { onlyStatus: 'failure' } };
export const PasswordSetup: Story = { args: { onlyStatus: 'sent', locale: 'en' } };
export const Recovery: Story = { args: { onlyStatus: 'recovery' } };

export const SetupFailure: Story = { args: { onlyStatus: 'setupFailure' } };
