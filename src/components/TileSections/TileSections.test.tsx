import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import { TileSections } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'de' } }),
}));

// ORISO-Admin#1558: long tiles (Funktionszugriff) fold their panels up and link a feature page.
describe('TileSections.Section', () => {
    it('is a named group with its note', () => {
        render(
            <TileSections.Section id="invite" title="Direkteinladung" note="Was das heißt">
                <p>Inhalt</p>
            </TileSections.Section>,
        );

        expect(screen.getByRole('group', { name: 'Direkteinladung' })).toHaveTextContent('Was das heißt');
    });

    it('folds up to its heading when collapsible', async () => {
        render(
            <TileSections.Section id="invite" title="Direkteinladung" note="Was das heißt" collapsible>
                <p>Inhalt</p>
            </TileSections.Section>,
        );
        const toggle = screen.getByRole('button', { name: 'Direkteinladung' });
        expect(toggle).toHaveAttribute('aria-expanded', 'true');

        await userEvent.click(toggle);

        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(screen.getByText('Inhalt')).not.toBeVisible();
        expect(screen.getByText('Was das heißt')).not.toBeVisible();
    });

    it('links the feature page, opening in a new tab', () => {
        render(
            <TileSections.Section id="share" title="Fälle teilen" learnMoreHref="https://understand.example.org/x.html">
                <p>Inhalt</p>
            </TileSections.Section>,
        );

        const link = screen.getByRole('link', { name: /tileSections\.learnMore/ });
        expect(link).toHaveAttribute('href', 'https://understand.example.org/x.html');
        expect(link).toHaveAttribute('target', '_blank');
    });
});
