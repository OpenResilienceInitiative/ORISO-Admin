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
    });

    it('shows the CTA as a snackbar instead of the inline bold hint', () => {
        render(<DataProcessingAgreementCard versions={[]} onPublish={vi.fn()} />);

        expect(screen.getByText('legal.help.dpa.platform.empty.text')).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent('legal.help.dpa.platform.empty.hint');
        // The hint is not duplicated inline while the snackbar shows it.
        expect(screen.getAllByText('legal.help.dpa.platform.empty.hint')).toHaveLength(1);
    });

    it('"nicht mehr anzeigen" hides the snackbar, persists, and falls back to the inline bold hint', async () => {
        const user = userEvent.setup();
        render(<DataProcessingAgreementCard versions={[]} onPublish={vi.fn()} />);

        await user.click(screen.getByRole('button', { name: 'legal.help.snackbar.dismiss' }));

        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(screen.getByText('legal.help.dpa.platform.empty.hint')).toBeInTheDocument();
        expect(window.localStorage.getItem('oriso-admin.legal.dpa.blocker.dismissed')).toBe('true');
    });

    it('stays hidden on the next render once dismissed', () => {
        window.localStorage.setItem('oriso-admin.legal.dpa.blocker.dismissed', 'true');
        render(<DataProcessingAgreementCard versions={[]} onPublish={vi.fn()} />);

        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(screen.getByText('legal.help.dpa.platform.empty.hint')).toBeInTheDocument();
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
