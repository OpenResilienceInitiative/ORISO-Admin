import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SelfConsultantIdentity } from './index';

vi.mock('react-i18next', () => {
    const t = (key: string) => key;
    const i18n = { language: 'de' };
    return { useTranslation: () => Object.assign([t, i18n], { t, i18n }) };
});

const mocks = vi.hoisted(() => ({
    roles: [] as string[],
    isSuperAdmin: false,
    userId: 'kc-admin-1' as string | undefined,
    modalProps: vi.fn(),
}));

vi.mock('../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({
        roles: mocks.roles,
        hasRole: (role: string | string[]) =>
            (Array.isArray(role) ? role : [role]).some((r) => mocks.roles.includes(r)),
        isSuperAdmin: mocks.isSuperAdmin,
        isTechnicalAccount: false,
        tenantId: 1,
    }),
}));

vi.mock('../../../hooks/useUserData.hook', () => ({
    useUserData: () => ({ data: { userId: mocks.userId } }),
}));

vi.mock('../../../components/GrantConsultantIdentityModal', () => ({
    GrantConsultantIdentityModal: (props: { adminId: string; disabled?: boolean }) => {
        mocks.modalProps(props);
        return (
            <button type="button" disabled={props.disabled}>
                grant
            </button>
        );
    },
}));

describe('SelfConsultantIdentity', () => {
    beforeEach(() => {
        mocks.isSuperAdmin = false;
        mocks.userId = 'kc-admin-1';
        mocks.modalProps.mockReset();
    });

    it('offers a Beratungsstellen-Admin the grant for their own account', () => {
        mocks.roles = ['agency-admin', 'user-admin'];
        render(<SelfConsultantIdentity />);

        expect(screen.getByRole('button', { name: 'grant' })).toBeEnabled();
        expect(mocks.modalProps).toHaveBeenCalledWith(expect.objectContaining({ adminId: 'kc-admin-1' }));
    });

    it('offers a Träger-Admin the same grant', () => {
        mocks.roles = ['tenant-admin', 'user-admin'];
        render(<SelfConsultantIdentity />);

        expect(screen.getByRole('button', { name: 'grant' })).toBeEnabled();
    });

    it('disables the grant and explains why when the account lacks user-admin', () => {
        mocks.roles = ['restricted-agency-admin'];
        render(<SelfConsultantIdentity />);

        expect(screen.getByRole('button', { name: 'grant' })).toBeDisabled();
        expect(screen.getByText('grantConsultantIdentity.self.noPermission')).toBeInTheDocument();
    });

    it('says so instead of offering the grant again once the admin is a counsellor', () => {
        mocks.roles = ['agency-admin', 'user-admin', 'consultant'];
        render(<SelfConsultantIdentity />);

        expect(screen.queryByRole('button', { name: 'grant' })).not.toBeInTheDocument();
        expect(screen.getByText('grantConsultantIdentity.self.already')).toBeInTheDocument();
    });

    it('stays away from platform admins', () => {
        mocks.roles = ['agency-admin', 'tenant-admin', 'user-admin'];
        mocks.isSuperAdmin = true;
        const { container } = render(<SelfConsultantIdentity />);

        expect(container).toBeEmptyDOMElement();
    });
});
