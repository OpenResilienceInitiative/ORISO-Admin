import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import { M3Button } from '.';

describe('M3Button while loading', () => {
    it('says it is busy on the button and keeps the spinner away from assistive technology', () => {
        render(<M3Button loading>Speichern</M3Button>);
        const button = screen.getByRole('button', { name: 'Speichern' });

        expect(button).toHaveAttribute('aria-busy', 'true');
        expect(screen.queryByRole('progressbar')).toBeNull();
        expect(button.querySelector('[aria-hidden="true"] [role="progressbar"]')).not.toBeNull();
    });

    it('is not busy otherwise', () => {
        render(<M3Button>Speichern</M3Button>);
        expect(screen.getByRole('button', { name: 'Speichern' })).not.toHaveAttribute('aria-busy');
    });
});
