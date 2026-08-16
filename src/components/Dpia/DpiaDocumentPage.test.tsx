import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DpiaDocumentPage } from './DpiaDocumentPage';

describe('DpiaDocumentPage', () => {
    it('renders the KDG norm citations by default and switches to DSGVO on click', () => {
        render(<DpiaDocumentPage />);

        expect(screen.getByText('§ 28 Abs. 1 S. 2 KDG')).toBeInTheDocument();
        expect(screen.queryByText('Art. 26 Abs. 1 DSGVO')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('radio', { name: 'DSGVO' }));

        expect(screen.getByText('Art. 26 Abs. 1 DSGVO')).toBeInTheDocument();
        expect(screen.queryByText('§ 28 Abs. 1 S. 2 KDG')).not.toBeInTheDocument();
    });

    it('switches the preset with ArrowRight/ArrowLeft and keeps aria-checked in sync', () => {
        render(<DpiaDocumentPage />);

        const kdgRadio = screen.getByRole('radio', { name: 'KDG' });
        const dsgvoRadio = screen.getByRole('radio', { name: 'DSGVO' });
        expect(kdgRadio).toHaveAttribute('aria-checked', 'true');
        expect(dsgvoRadio).toHaveAttribute('aria-checked', 'false');

        fireEvent.keyDown(kdgRadio, { key: 'ArrowRight' });

        expect(dsgvoRadio).toHaveAttribute('aria-checked', 'true');
        expect(kdgRadio).toHaveAttribute('aria-checked', 'false');
        expect(screen.getByText('Art. 26 Abs. 1 DSGVO')).toBeInTheDocument();

        fireEvent.keyDown(dsgvoRadio, { key: 'ArrowLeft' });

        expect(kdgRadio).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByText('§ 28 Abs. 1 S. 2 KDG')).toBeInTheDocument();
    });

    it('hides internal notes by default and reveals them on toggle', () => {
        render(<DpiaDocumentPage />);

        expect(screen.queryByText(/Dokumentationsstand/)).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Interne Anmerkungen/ }));

        expect(screen.getByText(/Dokumentationsstand/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Interne Anmerkungen/ }));

        expect(screen.queryByText(/Dokumentationsstand/)).not.toBeInTheDocument();
    });

    it('only renders chapter-nav links for chapters actually rendered on the page', () => {
        render(<DpiaDocumentPage />);

        expect(screen.getByRole('link', { name: /Kennzahlen/ })).toHaveAttribute('href', '#kap3');
        expect(screen.getByRole('link', { name: /Akteure & Rollen/ })).toHaveAttribute('href', '#kap4');
        expect(screen.getByRole('link', { name: /Technik/ })).toHaveAttribute('href', '#kap5');

        // Chapters not rendered as sections in this view must not be links.
        expect(screen.queryByRole('link', { name: /Scope/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Ergebnis/ })).not.toBeInTheDocument();
        expect(screen.getByText(/Scope/)).toHaveAttribute('aria-disabled', 'true');
    });

    it('labels the default key figures as sample data and drops the label once real figures are supplied', () => {
        const { rerender } = render(<DpiaDocumentPage />);
        expect(screen.getByText('Beispieldaten')).toBeInTheDocument();

        rerender(<DpiaDocumentPage keyFigures={[{ value: '1', label: 'Träger' }]} />);
        expect(screen.queryByText('Beispieldaten')).not.toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('documents the platform-admin tier with the full role bundle it actually needs (agency-admin + tenant-admin + user-admin)', () => {
        render(<DpiaDocumentPage />);

        // useUserRoles.hook.ts: isSuperAdmin = hasRole(AgencyAdmin) && hasRole(TenantAdmin) &&
        // tenantId === 0 identifies the tier, but userRolesToPermissions.ts only grants Consultant
        // CRUD (the matrix's "Beratende anlegen / einladen") to UserRole.UserAdmin — dropping it
        // would make that matrix cell false. agency-admin/tenant-admin tags are shared with the
        // tenant-admin tier below (same roles, different scope), so assert presence, not a single
        // match; user-admin is unique to the platform tier.
        expect(screen.getAllByText('agency-admin').length).toBeGreaterThan(0);
        expect(screen.getAllByText('tenant-admin').length).toBeGreaterThan(0);
        expect(screen.getByText('user-admin')).toBeInTheDocument();
    });

    it('marks 2FA deferral as a platform-admin-only affordance, not for tenant admins', () => {
        render(<DpiaDocumentPage />);

        // App.tsx: requiresPlatformAdminTwoFactor returns false outright for non-platform-admins.
        // TenantOnboarding/TwoFactorStep.tsx is a separate, non-skippable "Step 3 (#571): mandatory
        // 2FA setup" for tenant admins — no deferral for them.
        expect(screen.getByText('2FA erforderlich, Aufschub möglich')).toBeInTheDocument();
        expect(screen.getByText('2FA Pflicht')).toBeInTheDocument();
    });

    it("sets the chapter-nav sticky offset from the app bar's actual measured height", () => {
        const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
            configurable: true,
            // Simulates a wrapped, two-line app bar taller than the 61px fallback.
            get: () => 96,
        });

        try {
            const { container } = render(<DpiaDocumentPage />);
            const page = container.firstChild as HTMLElement;
            expect(page.style.getPropertyValue('--dpia-appbar-height')).toBe('96px');
            // Same measured-height mechanism drives the chapter nav's own height, which the
            // section anchors' scroll-margin-top also needs (see styles.module.scss).
            expect(page.style.getPropertyValue('--dpia-chapternav-height')).toBe('96px');
        } finally {
            if (originalOffsetHeight) {
                Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
            }
        }
    });
});
