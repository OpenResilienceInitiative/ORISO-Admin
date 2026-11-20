import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataProcessingAgreementCard } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

// Platform admin: the CTA tip lives in the dismissible snackbar for any DPA state.
vi.mock('../../../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({
        roles: [],
        hasRole: () => false,
        isSuperAdmin: true,
        isTechnicalAccount: false,
        isTenantScopedAdmin: false,
        tenantId: 0,
    }),
}));

vi.mock('../../../../FormPluginEditor/M3RichTextEditor', () => ({
    M3RichTextEditor: ({ helpSlot, snackbarSlot }: { helpSlot?: React.ReactNode; snackbarSlot?: React.ReactNode }) => (
        <div data-testid="editor">
            {helpSlot}
            {snackbarSlot}
        </div>
    ),
}));

describe('DataProcessingAgreementCard tip (platform admin)', () => {
    beforeEach(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
    });

    it('shows the empty-state CTA as plain tile text with a hide link, not as a pop-up', () => {
        render(<DataProcessingAgreementCard versions={[]} onPublish={vi.fn()} dismissalScope="tenant:user" />);

        expect(screen.getByText('legal.help.dpa.platform.empty.text')).toBeInTheDocument();
        expect(screen.getByText(/legal\.help\.dpa\.platform\.empty\.hint/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'legal.help.snackbar.dismiss' })).toBeInTheDocument();
        // Permanent help is tile text: nothing is raised on the pop-up channel.
        expect(screen.queryByTestId('snackbar')).not.toBeInTheDocument();
    });

    it('shows the published-state CTA as plain tile text for platform admins', () => {
        render(
            <DataProcessingAgreementCard
                versions={[{ id: '2026-07-13', label: '13. Jul 2026 – 10:22', content: '<p>AVV</p>' }]}
                onPublish={vi.fn()}
                dismissalScope="tenant:user"
            />,
        );

        expect(screen.getByText('legal.help.dpa.platform.published.text')).toBeInTheDocument();
        expect(screen.getAllByText(/legal\.help\.dpa\.platform\.published\.hint/)).toHaveLength(1);
        expect(screen.queryByTestId('snackbar')).not.toBeInTheDocument();
    });

    it('"nicht mehr anzeigen" removes the CTA text completely and persists', async () => {
        const user = userEvent.setup();
        render(<DataProcessingAgreementCard versions={[]} onPublish={vi.fn()} dismissalScope="tenant:user" />);

        await user.click(screen.getByRole('button', { name: 'legal.help.snackbar.dismiss' }));

        expect(screen.queryByText(/legal\.help\.dpa\.platform\.empty\.hint/)).not.toBeInTheDocument();
        expect(window.localStorage.getItem('oriso-admin.legal.dpa.blocker.dismissed.tenant:user')).toBe('true');
    });

    it('still honours a session-only close from an earlier version without writing localStorage', () => {
        window.sessionStorage.setItem('oriso-admin.legal.dpa.blocker.closed.tenant:user', 'true');
        render(<DataProcessingAgreementCard versions={[]} onPublish={vi.fn()} dismissalScope="tenant:user" />);

        expect(screen.queryByText(/legal\.help\.dpa\.platform\.empty\.hint/)).not.toBeInTheDocument();
        expect(window.localStorage.getItem('oriso-admin.legal.dpa.blocker.dismissed.tenant:user')).toBeNull();
    });

    it('stays completely hidden on the next render once dismissed', () => {
        window.localStorage.setItem('oriso-admin.legal.dpa.blocker.dismissed.tenant:user', 'true');
        render(<DataProcessingAgreementCard versions={[]} onPublish={vi.fn()} dismissalScope="tenant:user" />);

        expect(screen.queryByTestId('snackbar')).not.toBeInTheDocument();
        expect(screen.queryByText(/legal\.help\.dpa\.platform\.empty\.hint/)).not.toBeInTheDocument();
    });

    it('keeps dismissal independent between tenant and administrator scopes', async () => {
        const user = userEvent.setup();
        const first = render(
            <DataProcessingAgreementCard versions={[]} onPublish={vi.fn()} dismissalScope="tenant-1:user-1" />,
        );
        await user.click(screen.getByRole('button', { name: 'legal.help.snackbar.dismiss' }));
        first.unmount();

        render(<DataProcessingAgreementCard versions={[]} onPublish={vi.fn()} dismissalScope="tenant-2:user-1" />);
        expect(screen.getByText(/legal\.help\.dpa\.platform\.empty\.hint/)).toBeInTheDocument();
    });

    it('keeps the hint inline for non-platform roles (no hide link)', () => {
        render(
            <DataProcessingAgreementCard
                versions={[{ id: '2026-07-13', label: '13. Jul 2026 – 10:22', content: '<p>AVV</p>' }]}
                onPublish={vi.fn()}
                helpRole="agency"
            />,
        );

        expect(screen.queryByTestId('snackbar')).not.toBeInTheDocument();
        expect(screen.getByText('legal.help.dpa.agency.published.text')).toBeInTheDocument();
        expect(screen.getByText('legal.help.dpa.agency.published.hint')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'legal.help.snackbar.dismiss' })).not.toBeInTheDocument();
    });
});
