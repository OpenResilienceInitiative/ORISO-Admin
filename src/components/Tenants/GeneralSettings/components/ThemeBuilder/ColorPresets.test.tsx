// @vitest-environment oriso-jsdom
/**
 * Preset circles for the dark accent colour (#1374): radio semantics, the selected ring
 * follows the current seed, and every preset is a colour the palette engine can save.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import { brandSeedCannotYieldPalette } from '../../../../../utils/theme/seedUsability';
import { ColorPresets, THEME_PRESETS } from './ColorPresets';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

/** Hue in degrees for a `#rrggbb` colour. */
const hue = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b);
    const delta = max - Math.min(r, g, b);
    if (delta === 0) return 0;
    let h = 0;
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    return (h * 60 + 360) % 360;
};

describe('ColorPresets', () => {
    it('offers the presets as one radio group with Caritas-Rot first', () => {
        render(<ColorPresets value="#a5000a" onChange={() => undefined} />);

        const group = screen.getByRole('radiogroup', { name: 'theme.builder.presets.legend' });
        const radios = within(group).getAllByRole('radio');
        expect(radios.map((radio) => radio.getAttribute('value'))).toEqual(THEME_PRESETS.map(({ hex }) => hex));
        expect(within(group).getByRole('radio', { name: 'theme.builder.presets.caritasRed' })).toBeChecked();
    });

    it('matches the current colour regardless of case and shows its name and hex', () => {
        render(<ColorPresets value="#00639B" onChange={() => undefined} />);

        expect(screen.getByRole('radio', { name: 'theme.builder.presets.blue' })).toBeChecked();
        expect(screen.getByTestId('preset-status')).toHaveTextContent('theme.builder.presets.blue · #00639B');
    });

    it('marks an own colour as such and checks no circle', () => {
        render(<ColorPresets value="#123456" onChange={() => undefined} />);

        screen.getAllByRole('radio').forEach((radio) => expect(radio).not.toBeChecked());
        expect(screen.getByTestId('preset-status')).toHaveTextContent('theme.builder.presets.custom · #123456');
    });

    it('reports the tapped preset and lets the arrow keys move between colours', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<ColorPresets value="#a5000a" onChange={onChange} />);

        await user.click(screen.getByRole('radio', { name: 'theme.builder.presets.violet' }));
        expect(onChange).toHaveBeenLastCalledWith('#6b4fa0');

        screen.getByRole('radio', { name: 'theme.builder.presets.caritasRed' }).focus();
        await user.keyboard('{ArrowRight}');
        expect(onChange).toHaveBeenLastCalledWith('#00639b');
    });

    it('cannot be changed while the dark accent is locked', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<ColorPresets value="#a5000a" onChange={onChange} disabled />);

        screen.getAllByRole('radio').forEach((radio) => expect(radio).toBeDisabled());
        await user.click(screen.getByRole('radio', { name: 'theme.builder.presets.blue' }));
        expect(onChange).not.toHaveBeenCalled();
    });

    it('only offers colours the palette engine can save', () => {
        THEME_PRESETS.forEach(({ hex }) => expect(brandSeedCannotYieldPalette(hex)).toBe(false));
    });

    it('offers no green (ORISO colour rule)', () => {
        THEME_PRESETS.forEach(({ hex }) => {
            const h = hue(hex);
            expect(h < 75 || h > 165).toBe(true);
        });
    });
});
