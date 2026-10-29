import type { Meta, StoryObj } from '@storybook/react-vite';
import { PasswordChangeCounsellorNotice } from './PasswordChangeCounsellorNotice';

/**
 * Notice above the "Mein Konto" password form for accounts that are admin and counsellor at once
 * (ORISO-Frontend#1931). Informational only; the password change is never blocked.
 */
const meta = {
    title: 'Pages/Profile/PasswordChangeCounsellorNotice',
    component: PasswordChangeCounsellorNotice,
} satisfies Meta<typeof PasswordChangeCounsellorNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithLinkToCounsellingApp: Story = {
    args: { counsellingAppUrl: 'https://beratung.example.org' },
};

export const TextOnly: Story = {
    args: { counsellingAppUrl: null },
};
