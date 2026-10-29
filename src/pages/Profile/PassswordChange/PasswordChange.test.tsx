import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordChange } from './index';
import { PasswordChangeCounsellorNotice } from './PasswordChangeCounsellorNotice';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const mocks = vi.hoisted(() => ({
    isCounsellor: false,
    onSuccess: undefined as undefined | (() => void),
    success: vi.fn(),
}));

vi.mock('../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({ isCounsellor: mocks.isCounsellor }),
}));

vi.mock('../../../hooks/useUpdateUserPassword.hook', () => ({
    useUpdateUserPassword: (options: { onSuccess: () => void }) => {
        mocks.onSuccess = options.onSuccess;
        return { mutate: vi.fn() };
    },
}));

vi.mock('antd', async (importOriginal) => {
    const antd = await importOriginal<typeof import('antd')>();
    return { ...antd, notification: { success: mocks.success, error: vi.fn() } };
});

const openForm = async () => {
    render(<PasswordChange />);
    await userEvent.click(screen.getByText('profile.passwordChange.editButton'));
};

describe('PasswordChange counsellor notice', () => {
    beforeEach(() => {
        mocks.isCounsellor = false;
        mocks.success.mockReset();
    });

    it('shows the notice above the form for accounts that also counsel', async () => {
        mocks.isCounsellor = true;
        await openForm();
        expect(screen.getByText('profile.passwordChange.counsellorNotice')).toBeInTheDocument();
        expect(document.getElementById('oldPassword')).toBeInTheDocument();
    });

    it('shows no notice for admins without the consultant role', async () => {
        await openForm();
        expect(screen.queryByText('profile.passwordChange.counsellorNotice')).not.toBeInTheDocument();
        expect(document.getElementById('oldPassword')).toBeInTheDocument();
    });

    it('adds the recovery line to the success message for counsellors only', () => {
        mocks.isCounsellor = true;
        const { unmount } = render(<PasswordChange />);
        mocks.onSuccess?.();
        expect(mocks.success).toHaveBeenCalledWith({
            message: 'profile.passwordChange.success',
            description: 'profile.passwordChange.success.counsellor',
        });
        unmount();

        mocks.isCounsellor = false;
        render(<PasswordChange />);
        mocks.onSuccess?.();
        expect(mocks.success).toHaveBeenLastCalledWith({
            message: 'profile.passwordChange.success',
            description: undefined,
        });
    });
});

describe('PasswordChangeCounsellorNotice', () => {
    it('links to the counselling app when its URL is known', () => {
        render(<PasswordChangeCounsellorNotice counsellingAppUrl="https://app.example.org" />);
        expect(screen.getByRole('link', { name: 'profile.passwordChange.counsellorNotice.link' })).toHaveAttribute(
            'href',
            'https://app.example.org',
        );
    });

    it('shows text only without an app URL', () => {
        render(<PasswordChangeCounsellorNotice counsellingAppUrl={null} />);
        expect(screen.getByText('profile.passwordChange.counsellorNotice')).toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
});
