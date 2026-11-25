import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { UserRole } from '../../../enums/UserRole';
import { PermissionsSettingsPage } from '.';

const roles = vi.hoisted(() => ({ current: { isSuperAdmin: false, tenantId: 7, list: [] as string[] } }));

vi.mock('../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({
        isSuperAdmin: roles.current.isSuperAdmin,
        tenantId: roles.current.tenantId,
        hasRole: (role: string | string[]) => [role].flat().some((r) => roles.current.list.includes(r)),
    }),
}));

vi.mock('../../../components/Tenants/AppSettings/PermissionsSettings', () => ({
    PermissionsSettings: ({ liveChatLinks }: { liveChatLinks?: ReactNode }) => (
        <div data-testid="permissions">{liveChatLinks}</div>
    ),
}));

vi.mock('../../../components/LiveChatLinks', () => ({
    LiveChatLinks: ({ mode }: { mode: string }) => <div data-testid="live-chat-links" data-mode={mode} />,
}));

describe('Einstellungen → Funktionszugriff (ORISO-Admin#1321)', () => {
    beforeEach(() => {
        roles.current = { isSuperAdmin: false, tenantId: 7, list: [] };
    });

    it('lets the platform admin manage the live-chat links', () => {
        roles.current = { isSuperAdmin: true, tenantId: 0, list: [UserRole.TenantAdmin, UserRole.AgencyAdmin] };

        render(<PermissionsSettingsPage />);

        expect(screen.getByTestId('permissions')).toBeTruthy();
        expect(screen.getByTestId('live-chat-links').dataset.mode).toBe('manage');
    });

    it('shows a Träger admin the links read-only', () => {
        roles.current = { isSuperAdmin: false, tenantId: 7, list: [UserRole.TenantAdmin] };

        render(<PermissionsSettingsPage />);

        expect(screen.getByTestId('live-chat-links').dataset.mode).toBe('read');
    });

    it('shows no links to an admin without access', () => {
        render(<PermissionsSettingsPage />);

        expect(screen.queryByTestId('live-chat-links')).toBeNull();
    });
});
