import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SplitButton } from './SplitButton';
import styles from './splitButton.module.scss';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

const menu = { items: [{ key: 'a', label: 'Option A' }] };

/** The root is the wrapper that carries size/variant/state classes. */
const root = (label: string) => screen.getByRole('button', { name: label }).parentElement as HTMLElement;

describe('SplitButton size scale (Figma 57994-15744)', () => {
    it('defaults to the medium (56px) geometry so existing callers do not shift', () => {
        render(<SplitButton label="Senden" />);
        expect(root('Senden').classList.contains(styles.medium)).toBe(true);
    });

    it.each(['xsmall', 'small', 'medium', 'large', 'xlarge'] as const)('applies the %s size class', (size) => {
        render(<SplitButton label={size} size={size} />);
        expect(root(size).classList.contains(styles[size])).toBe(true);
    });
});

describe('SplitButton variant mapping (M3 sheet: filled/tonal/outlined/elevated)', () => {
    it.each(['filled', 'tonal', 'outlined', 'elevated'] as const)('applies the %s variant class', (variant) => {
        render(<SplitButton label={variant} variant={variant} />);
        expect(root(variant).classList.contains(styles[variant])).toBe(true);
    });

    it('keeps `primary` as an alias of filled', () => {
        render(<SplitButton label="Senden" variant="primary" />);
        expect(root('Senden').classList.contains(styles.filled)).toBe(true);
    });

    it('keeps `secondary` as an alias of tonal (M3 secondary container)', () => {
        render(<SplitButton label="23" variant="secondary" />);
        expect(root('23').classList.contains(styles.tonal)).toBe(true);
    });

    it('defaults to outlined', () => {
        render(<SplitButton label="Senden" />);
        expect(root('Senden').classList.contains(styles.outlined)).toBe(true);
    });
});

describe('SplitButton open state', () => {
    it('marks the root open and expands the chevron on click', async () => {
        const user = userEvent.setup();
        render(<SplitButton label="Vorlage" menu={menu} menuLabel="Menü öffnen" />);
        const chevron = screen.getByRole('button', { name: 'Menü öffnen' });
        expect(chevron).toHaveAttribute('aria-expanded', 'false');
        await user.click(chevron);
        expect(chevron).toHaveAttribute('aria-expanded', 'true');
        expect(root('Vorlage').classList.contains(styles.open)).toBe(true);
    });

    it('supports a controlled open state for stories and E2E', () => {
        render(<SplitButton label="Vorlage" menu={menu} menuLabel="Menü öffnen" open />);
        expect(root('Vorlage').classList.contains(styles.open)).toBe(true);
        expect(screen.getByRole('button', { name: 'Menü öffnen' })).toHaveAttribute('aria-expanded', 'true');
    });

    it('never reports open while disabled', () => {
        render(<SplitButton disabled label="Vorlage" menu={menu} menuLabel="Menü öffnen" open />);
        expect(root('Vorlage').classList.contains(styles.open)).toBe(false);
        expect(screen.getByRole('button', { name: 'Menü öffnen' })).toHaveAttribute('aria-expanded', 'false');
    });
});

describe('SplitButton segment behaviour (regression guard for existing callers)', () => {
    it('disables only the main segment with mainDisabled while the menu stays reachable', () => {
        render(<SplitButton label="Senden" mainDisabled menu={menu} menuLabel="Sendeoptionen" />);
        expect(screen.getByRole('button', { name: 'Senden' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Sendeoptionen' })).toBeEnabled();
    });

    it('renders the opt-in collapse segment', async () => {
        const user = userEvent.setup();
        const onCollapse = vi.fn();
        render(<SplitButton collapseLabel="Auswahl aufheben" label="23" onCollapse={onCollapse} />);
        await user.click(screen.getByRole('button', { name: 'Auswahl aufheben' }));
        expect(onCollapse).toHaveBeenCalledTimes(1);
    });
});
