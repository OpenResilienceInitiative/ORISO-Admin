import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Icon from '@ant-design/icons';
import { SplitDropdown } from './SplitDropdown';

// @ant-design/icons renders its glyph as <span role="img">. A role="img" with
// no accessible name is an axe `role-img-alt` violation (serious, WCAG 1.1.1),
// and it fired on every legal/DPIA editor story that shows this split button.
// The button already names itself through `title`/`aria-label`, so the leading
// glyph is decorative and must be hidden from assistive tech rather than
// given a redundant label.
const GlyphSvg = () => <svg />;
const Glyph = () => <Icon component={GlyphSvg} />;

describe('SplitDropdown leading icon', () => {
    it('hides the decorative leading icon from assistive tech', () => {
        render(<SplitDropdown icon={<Glyph />} label="Alle Themen" title="Fachbereich wählen" menu={{ items: [] }} />);

        const button = screen.getByRole('button', { name: 'Fachbereich wählen' });
        const glyph = button.querySelector('[role="img"]');

        expect(glyph).not.toBeNull();
        // Hidden via an ancestor, so the assertion must not care HOW it is hidden.
        expect(glyph?.closest('[aria-hidden="true"]')).not.toBeNull();
    });

    it('keeps the visible label reachable so the current selection is announced', () => {
        render(<SplitDropdown icon={<Glyph />} label="Alle Themen" title="Fachbereich wählen" menu={{ items: [] }} />);

        // Hiding the icon must not hide the label with it.
        expect(screen.getByText('Alle Themen')).toBeInTheDocument();
        expect(screen.getByText('Alle Themen').closest('[aria-hidden="true"]')).toBeNull();
    });
});
