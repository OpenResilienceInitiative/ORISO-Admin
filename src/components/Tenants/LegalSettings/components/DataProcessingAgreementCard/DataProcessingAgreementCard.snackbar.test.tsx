import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataProcessingAgreementCard } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

// Platform admin: the "no DPA published yet" state carries the blocker snackbar.
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

describe('DataProcessingAgreementCard blocker snackbar (platform admin, no published DPA)', () => {
    beforeEach(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
    });

    it('shows the CTA as a snackbar instead of the inline bold hint', () => {
        render(<DataProcessingAgreementCard versions={[]} onPublish={vi.fn()} />);

        expect(screen.getByText('legal.help.dpa.platform.empty.text')).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent('legal.help.dpa.platform.empty.hint');
        // The hint is not duplicated inline while the snackbar shows it.
        expect(screen.getAllByText('legal.help.dpa.platform.empty.hint')).toHaveLength(1);
    });

    it('"nicht mehr anzeigen" removes the CTA text completely and persists', async () => {
        const user = userEvent.setup();
        render(<DataProcessingAgreementCard versions={[]} onPublish={vi.fn()} />);

        await user.click(screen.getByRole('button', { name: 'legal.help.snackbar.dismiss' }));

        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(screen.queryByText('legal.help.dpa.platform.empty.hint')).not.toBeInTheDocument();
        expect(window.localStorage.getItem('oriso-admin.legal.dpa.blocker.dismissed.unscoped')).toBe('true');
    });

    it('"X" hides the snackbar for the browser session but leaves localStorage untouched', async () => {
        const user = userEvent.setup();
        const first = render(<DataProcessingAgreementCard versions={[]} onPublish={vi.fn()} />);

        await user.click(screen.getByRole('button', { name: 'legal.help.snackbar.close' }));

        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(screen.queryByText('legal.help.dpa.platform.empty.hint')).not.toBeInTheDocument();
        // Unlike "nicht mehr anzeigen", the X does not write the dismissal key.
        expect(window.localStorage.getItem('oriso-admin.legal.dpa.blocker.dismissed.unscoped')).toBeNull();
        expect(window.sessionStorage.getItem('oriso-admin.legal.dpa.blocker.closed.unscoped')).toBe('true');

        first.unmount();
        render(<DataProcessingAgreementCard versions={[]} onPublish={vi.fn()} />);
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('stays completely hidden on the next render once dismissed', () => {
        window.localStorage.setItem('oriso-admin.legal.dpa.blocker.dismissed.unscoped', 'true');
        render(<DataProcessingAgreementCard versions={[]} onPublish={vi.fn()} />);

        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(screen.queryByText('legal.help.dpa.platform.empty.hint')).not.toBeInTheDocument();
    });

    it('keeps dismissal independent between tenant and administrator scopes', async () => {
        const user = userEvent.setup();
        const first = render(
            <DataProcessingAgreementCard versions={[]} onPublish={vi.fn()} dismissalScope="tenant-1:user-1" />,
        );
        await user.click(screen.getByRole('button', { name: 'legal.help.snackbar.dismiss' }));
        first.unmount();

        render(<DataProcessingAgreementCard versions={[]} onPublish={vi.fn()} dismissalScope="tenant-2:user-1" />);
        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('does not show the blocker once a version is published', () => {
        render(
            <DataProcessingAgreementCard
                versions={[{ id: '2026-07-13', label: '13. Jul 2026 – 10:22', content: '<p>AVV</p>' }]}
                onPublish={vi.fn()}
            />,
        );

        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(screen.getByText('legal.help.dpa.platform.published.text')).toBeInTheDocument();
        expect(screen.getByText('legal.help.dpa.platform.published.hint')).toBeInTheDocument();
    });
});
