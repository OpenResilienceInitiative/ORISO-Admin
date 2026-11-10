import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vite-plus/test';
import i18n from '../../i18n';
import { ContrastBadge, ContrastNotice } from './index';

describe('ContrastBadge (#1374)', () => {
    beforeAll(async () => {
        await i18n.changeLanguage('de');
    });

    it('rates a dark brand colour as AAA against white text', () => {
        render(<ContrastBadge color="#a5000a" />);

        const badge = screen.getByRole('img');
        expect(badge).toHaveAttribute('data-contrast-level', 'AAA');
        expect(badge).toHaveTextContent(/^AAA · \d+,\d$/);
        expect(badge.getAttribute('title')).toMatch(/^Kontrast \d+,\d : 1 mit weißer Schrift\.$/);
        expect(badge).toHaveAccessibleName(/^AAA – Kontrast \d+,\d : 1 mit weißer Schrift\.$/);
    });

    it('rates a light colour against dark text', () => {
        render(<ContrastBadge color="#ffe2de" />);

        expect(screen.getByRole('img').getAttribute('title')).toMatch(/mit dunkler Schrift/);
    });

    it('shows AA between 4.5 and 7', () => {
        render(<ContrastBadge color="#d32f2f" />);

        expect(screen.getByRole('img')).toHaveTextContent(/^AA · \d,\d$/);
    });

    it('warns below 4.5 : 1 and says so in words, not only colour', () => {
        render(<ContrastBadge color="#808080" />);

        const badge = screen.getByRole('img');
        expect(badge).toHaveAttribute('data-contrast-level', 'fail');
        expect(badge).toHaveTextContent(/^Zu schwach · \d,\d$/);
        expect(badge.getAttribute('title')).toMatch(/Unter dem WCAG-Mindestwert von 4,5 : 1/);
    });

    it('renders nothing for a missing or invalid colour', () => {
        const { container } = render(<ContrastBadge color="nope" />);

        expect(container).toBeEmptyDOMElement();
    });
});

describe('ContrastNotice (#1374)', () => {
    beforeAll(async () => {
        await i18n.changeLanguage('de');
    });

    it('renders nothing when every colour reaches 4.5 : 1', () => {
        const { container } = render(
            <ContrastNotice
                colors={[
                    { name: 'Dunkle Akzentfarbe', color: '#a5000a' },
                    { name: 'Helle Akzentfarbe', color: '#ffe2de' },
                ]}
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it('names the one colour below 4.5 : 1', () => {
        render(
            <ContrastNotice
                colors={[
                    { name: 'Dunkle Akzentfarbe', color: '#a5000a' },
                    { name: 'Fehlerzustand', color: '#808080' },
                ]}
            />,
        );

        expect(screen.getByRole('status')).toHaveTextContent(
            '„Fehlerzustand“ erreicht nicht 4,5 : 1 Kontrast zur Schrift darauf',
        );
    });

    it('names every failing colour in one line', () => {
        render(
            <ContrastNotice
                colors={[
                    { name: 'Helle Akzentfarbe', color: '#7a7a7a' },
                    { name: 'Fehlerzustand', color: '#808080' },
                ]}
            />,
        );

        expect(screen.getByRole('status')).toHaveTextContent(
            '„Helle Akzentfarbe“, „Fehlerzustand“ erreichen nicht 4,5 : 1',
        );
    });
});
