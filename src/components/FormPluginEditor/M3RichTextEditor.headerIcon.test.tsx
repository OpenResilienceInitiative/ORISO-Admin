import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { M3RichTextEditor } from './M3RichTextEditor';
import { DpaIcon } from '../CustomIcons/LegalIcons';

describe('M3RichTextEditor header icon', () => {
    // The header pairs the icon with an <h2> carrying the same title, so the
    // glyph adds nothing for a screen reader. Left exposed it renders as an
    // unnamed role="img" (axe `role-img-alt`, serious, WCAG 1.1.1).
    it('hides the decorative header icon from assistive tech', async () => {
        render(<M3RichTextEditor title="Auftragsdaten Verarbeitungsvertrag" icon={DpaIcon} />);

        const heading = await screen.findByRole('heading', { name: 'Auftragsdaten Verarbeitungsvertrag' });
        const header = heading.parentElement as HTMLElement;
        const glyph = header.querySelector('[role="img"]');

        expect(glyph).not.toBeNull();
        expect(glyph).toHaveAttribute('aria-hidden', 'true');
    }, 15_000);
});
