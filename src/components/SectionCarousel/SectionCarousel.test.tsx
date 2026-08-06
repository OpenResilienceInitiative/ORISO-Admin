import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SectionCarousel, type SectionCarouselItem } from './SectionCarousel';

const items: SectionCarouselItem[] = [
    { key: 'global_config', label: 'Globale Einstellungen', icon: <svg /> },
    { key: 'legal', label: 'Rechtliches', image: '/legal.webp' },
    { key: 'smtp', label: 'E-Mail-Server', icon: <svg /> },
];

const renderCarousel = (props: Partial<React.ComponentProps<typeof SectionCarousel>> = {}) =>
    render(
        <MemoryRouter>
            <SectionCarousel ariaLabel="Bereiche" items={items} activeKey="legal" {...props} />
        </MemoryRouter>,
    );

describe('SectionCarousel', () => {
    it('marks the open section as the selected tab', () => {
        renderCarousel();

        expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Rechtliches');
    });

    it('renders artwork when a section has it and the icon otherwise', () => {
        const { container } = renderCarousel();
        const artwork = container.querySelectorAll('img');

        // Exactly one section has artwork; the other two fall back to their icon.
        expect(artwork).toHaveLength(1);
        expect(artwork[0]).toHaveAttribute('src', '/legal.webp');
        // Decorative: the label underneath already names the section, so the
        // artwork must stay out of the accessibility tree rather than repeat it.
        expect(artwork[0]).toHaveAttribute('alt', '');
    });

    it('reports the chosen section', async () => {
        const onSelect = vi.fn();
        renderCarousel({ onSelect });

        await userEvent.click(screen.getByText('E-Mail-Server'));

        expect(onSelect).toHaveBeenCalledWith('smtp');
    });

    it('keeps a single tab stop and moves the rest with arrow keys', async () => {
        renderCarousel();

        const tabs = screen.getAllByRole('tab');

        expect(tabs.map((tab) => tab.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);

        tabs[1].focus();
        await userEvent.keyboard('{ArrowRight}');

        expect(tabs[2]).toHaveFocus();
    });

    it('does not wrap past the ends of the strip', async () => {
        renderCarousel();

        const tabs = screen.getAllByRole('tab');

        tabs[2].focus();
        await userEvent.keyboard('{ArrowRight}');

        expect(tabs[2]).toHaveFocus();
    });

    it('jumps to the first and last section with Home and End', async () => {
        renderCarousel();

        const tabs = screen.getAllByRole('tab');

        tabs[1].focus();
        await userEvent.keyboard('{End}');
        expect(tabs[2]).toHaveFocus();

        await userEvent.keyboard('{Home}');
        expect(tabs[0]).toHaveFocus();
    });

    it('makes the first card reachable when no section is open yet', () => {
        renderCarousel({ activeKey: undefined });

        expect(screen.getAllByRole('tab').map((tab) => tab.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    });

    it('navigates via link when a section carries a route', () => {
        renderCarousel({ items: [{ ...items[0], to: '/admin/settings/global-config' }] });

        expect(screen.getByRole('tab')).toHaveAttribute('href', '/admin/settings/global-config');
    });

    it('never sets aria-current on a routed tab, even when the router is already at that path', () => {
        // NavLink would add aria-current="page" here on its own, since `to`
        // matches the router's actual current location — role="tab" must only
        // ever carry aria-selected.
        render(
            <MemoryRouter initialEntries={['/admin/settings/global-config']}>
                <SectionCarousel
                    activeKey="global_config"
                    ariaLabel="Bereiche"
                    items={[{ ...items[0], to: '/admin/settings/global-config' }]}
                />
            </MemoryRouter>,
        );

        const tab = screen.getByRole('tab');
        expect(tab).not.toHaveAttribute('aria-current');
        expect(tab).toHaveAttribute('aria-selected', 'true');
    });
});
