import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import { TileSection } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'de' } }),
}));

const help = { id: 'x', titleKey: 'x.title', slides: [{ id: 's', titleKey: 's.title', bodyKey: 's.body' }] };

// ORISO-Admin#1558: sections of a long tile fold up and explain themselves.
describe('TileSection', () => {
    it('is a named region with its description', () => {
        render(
            <TileSection title="Direkteinladung" description="Was das heißt">
                <p>Inhalt</p>
            </TileSection>,
        );

        expect(screen.getByRole('region', { name: 'Direkteinladung' })).toHaveTextContent('Was das heißt');
    });

    it('folds up to its heading', async () => {
        render(
            <TileSection title="Direkteinladung" collapsible>
                <p>Inhalt</p>
            </TileSection>,
        );
        const toggle = screen.getByRole('button', { name: 'Direkteinladung' });
        expect(toggle).toHaveAttribute('aria-expanded', 'true');

        await userEvent.click(toggle);

        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(screen.getByText('Inhalt')).not.toBeVisible();
    });

    it('offers its explanation and the feature page, opening in a new tab', () => {
        render(
            <TileSection title="Fälle teilen" help={help} learnMoreHref="https://understand.oriso.org/features/x.html">
                <p>Inhalt</p>
            </TileSection>,
        );

        expect(screen.getByRole('button', { name: /tileHelp\.open/ })).toBeInTheDocument();
        const link = screen.getByRole('link', { name: /tenants\.permissions\.section\.learnMore/ });
        expect(link).toHaveAttribute('href', 'https://understand.oriso.org/features/x.html');
        expect(link).toHaveAttribute('target', '_blank');
    });
});
