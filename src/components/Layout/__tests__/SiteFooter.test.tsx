import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SiteFooter from '../SiteFooter';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            if (key === 'footer.label.imprint') {
                return 'Imprint';
            }
            if (key === 'footer.label.privacy') {
                return 'Privacy';
            }
            return key;
        },
    }),
}));

describe('SiteFooter', () => {
    it('FooterImpressumLink shows imprint label without a clickable link', () => {
        render(
            <MemoryRouter>
                <SiteFooter />
            </MemoryRouter>,
        );

        expect(screen.getByText('Imprint')).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Imprint' })).not.toBeInTheDocument();
    });

    it('FooterPrivacyLink shows privacy label without a clickable link', () => {
        render(
            <MemoryRouter>
                <SiteFooter />
            </MemoryRouter>,
        );

        expect(screen.getByText('Privacy')).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Privacy' })).not.toBeInTheDocument();
    });
});
