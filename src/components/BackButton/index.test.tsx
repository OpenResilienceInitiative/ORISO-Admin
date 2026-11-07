import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { BackButton } from './index';

const renderOnDetailPage = (ui: ReactNode) =>
    render(
        <MemoryRouter initialEntries={['/admin/tenants/1']}>
            <Routes>
                <Route
                    path="/admin/tenants/1"
                    element={
                        <>
                            {ui}
                            <p>Detailseite</p>
                        </>
                    }
                />
                <Route path="/admin/tenants" element={<p>Träger-Liste</p>} />
            </Routes>
        </MemoryRouter>,
    );

const setOverflow = (scrollWidth: number, clientWidth: number) => {
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => scrollWidth });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => clientWidth });
};

afterEach(() => {
    // Back to jsdom's own (zero) layout measurements.
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollWidth');
    Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth');
});

describe('BackButton', () => {
    it('is a real link to the target, named by its visible text', () => {
        renderOnDetailPage(<BackButton label="Zurück zu Träger" to="/admin/tenants" />);

        const link = screen.getByRole('link', { name: 'Zurück zu Träger' });
        expect(link).toHaveAttribute('href', '/admin/tenants');
    });

    it('goes back on click', async () => {
        const user = userEvent.setup();
        renderOnDetailPage(<BackButton label="Zurück zu Träger" to="/admin/tenants" />);

        await user.click(screen.getByRole('link', { name: 'Zurück zu Träger' }));

        expect(screen.getByText('Träger-Liste')).toBeInTheDocument();
        expect(screen.queryByText('Detailseite')).not.toBeInTheDocument();
    });

    it('is reached with one Tab and goes back with Enter', async () => {
        const user = userEvent.setup();
        renderOnDetailPage(<BackButton label="Zurück zu Träger" to="/admin/tenants" />);

        await user.tab();
        expect(screen.getByRole('link', { name: 'Zurück zu Träger' })).toHaveFocus();

        await user.keyboard('{Enter}');
        expect(screen.getByText('Träger-Liste')).toBeInTheDocument();
    });

    it('runs onClick before it navigates', async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();
        renderOnDetailPage(<BackButton label="Zurück zu Träger" to="/admin/tenants" onClick={onClick} />);

        await user.click(screen.getByRole('link', { name: 'Zurück zu Träger' }));

        expect(onClick).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Träger-Liste')).toBeInTheDocument();
    });

    it('is a button without a target and works with Enter and Space', async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();
        renderOnDetailPage(<BackButton label="Zurück" onClick={onClick} />);

        const button = screen.getByRole('button', { name: 'Zurück' });
        expect(screen.queryByRole('link')).not.toBeInTheDocument();

        await user.tab();
        expect(button).toHaveFocus();
        await user.keyboard('{Enter}');
        await user.keyboard(' ');

        expect(onClick).toHaveBeenCalledTimes(2);
    });

    it('hides the arrow from assistive technology in every look', () => {
        renderOnDetailPage(
            <>
                <BackButton label="Zurück zu Träger" to="/admin/tenants" variant="tonal" />
                <BackButton label="Zurück zu Träger" to="/admin/tenants" variant="text" />
                <BackButton label="Träger" to="/admin/tenants" variant="breadcrumb" current="Mandant" />
            </>,
        );

        const icons = document.querySelectorAll('svg');
        expect(icons.length).toBeGreaterThan(0);
        icons.forEach((icon) => expect(icon).toHaveAttribute('aria-hidden', 'true'));
    });
});

describe('BackButton icon only (mobile bottom bar)', () => {
    it('keeps the name as aria-label and draws no text', () => {
        renderOnDetailPage(<BackButton iconOnly label="Zurück zu Träger" to="/admin/tenants" />);

        const link = screen.getByRole('link', { name: 'Zurück zu Träger' });
        expect(link).toHaveAttribute('aria-label', 'Zurück zu Träger');
        expect(link).toHaveTextContent('');
    });

    it('shows its name in a tooltip on keyboard focus, without announcing it twice', async () => {
        const user = userEvent.setup();
        renderOnDetailPage(<BackButton iconOnly label="Zurück zu Träger" to="/admin/tenants" />);

        await user.tab();

        expect(await screen.findByRole('tooltip')).toHaveTextContent('Zurück zu Träger');
        expect(screen.getByRole('link', { name: 'Zurück zu Träger' })).not.toHaveAttribute('aria-describedby');
    });
});

describe('BackButton long labels', () => {
    const LONG = 'Zurück zu Träger-Verwaltung für Beratungsstellen der Diakonie Mitteldeutschland e. V.';

    it('shows the full text in a tooltip when the label is cut off', async () => {
        setOverflow(480, 200);
        const user = userEvent.setup();
        renderOnDetailPage(<BackButton label={LONG} to="/admin/tenants" />);

        await user.hover(screen.getByRole('link', { name: LONG }));

        expect(await screen.findByRole('tooltip')).toHaveTextContent(LONG);
    });

    it('adds no tooltip when the label fits', async () => {
        setOverflow(120, 200);
        const user = userEvent.setup();
        renderOnDetailPage(<BackButton label="Zurück zu Träger" to="/admin/tenants" />);

        await user.hover(screen.getByRole('link', { name: 'Zurück zu Träger' }));

        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
});

describe('BackButton focus while the label is cut off', () => {
    it('stays the same focused element when a resize starts to cut the label', async () => {
        setOverflow(120, 200);
        const user = userEvent.setup();
        const tree = (label: string) => (
            <MemoryRouter>
                <BackButton label={label} to="/admin/tenants" />
            </MemoryRouter>
        );
        const { rerender } = render(tree('Zurück zu Träger'));
        await user.tab();
        const link = screen.getByRole('link', { name: 'Zurück zu Träger' });
        expect(link).toHaveFocus();

        // The label no longer fits: the measurement runs again for the new text.
        setOverflow(480, 200);
        rerender(tree('Zurück zu Träger-Verwaltung'));

        const sameLink = screen.getByRole('link', { name: 'Zurück zu Träger-Verwaltung' });
        expect(sameLink).toBe(link);
        expect(sameLink).toHaveFocus();
        expect(await screen.findByRole('tooltip')).toHaveTextContent('Zurück zu Träger-Verwaltung');
    });
});

describe('BackButton breadcrumb', () => {
    it('is a navigation landmark with the parent as link and the current page as plain text', async () => {
        const user = userEvent.setup();
        renderOnDetailPage(
            <BackButton
                variant="breadcrumb"
                label="Träger"
                to="/admin/tenants"
                current="Beispiel-Mandant"
                trailLabel="Seitenpfad"
            />,
        );

        expect(screen.getByRole('navigation', { name: 'Seitenpfad' })).toBeInTheDocument();
        const current = screen.getByText('Beispiel-Mandant');
        expect(current.closest('li')).toHaveAttribute('aria-current', 'page');
        expect(screen.queryByRole('link', { name: 'Beispiel-Mandant' })).not.toBeInTheDocument();

        await user.click(screen.getByRole('link', { name: 'Träger' }));
        expect(screen.getByText('Träger-Liste')).toBeInTheDocument();
    });

    it('gives the landmark no name of its own when none is passed (no hard-coded German)', () => {
        renderOnDetailPage(<BackButton variant="breadcrumb" label="Träger" to="/admin/tenants" current="Mandant" />);

        expect(screen.getByRole('navigation')).not.toHaveAttribute('aria-label');
    });

    it('ignores iconOnly: a trail without its words is no trail', () => {
        renderOnDetailPage(<BackButton variant="breadcrumb" iconOnly label="Träger" to="/admin/tenants" />);

        expect(screen.getByRole('link', { name: 'Träger' })).toHaveTextContent('Träger');
    });
});
