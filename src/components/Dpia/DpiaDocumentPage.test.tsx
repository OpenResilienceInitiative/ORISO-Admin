import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DpiaDocumentPage } from './DpiaDocumentPage';

describe('DpiaDocumentPage', () => {
    it('renders the KDG norm citations by default and switches to DSGVO on click', () => {
        render(<DpiaDocumentPage />);

        expect(screen.getByText('§ 28 Abs. 1 S. 2 KDG')).toBeInTheDocument();
        expect(screen.queryByText('Art. 26 Abs. 1 DSGVO')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('radio', { name: 'DSGVO' }));

        expect(screen.getByText('Art. 26 Abs. 1 DSGVO')).toBeInTheDocument();
        expect(screen.queryByText('§ 28 Abs. 1 S. 2 KDG')).not.toBeInTheDocument();
    });

    it('switches the preset with ArrowRight/ArrowLeft and keeps aria-checked in sync', () => {
        render(<DpiaDocumentPage />);

        const kdgRadio = screen.getByRole('radio', { name: 'KDG' });
        const dsgvoRadio = screen.getByRole('radio', { name: 'DSGVO' });
        expect(kdgRadio).toHaveAttribute('aria-checked', 'true');
        expect(dsgvoRadio).toHaveAttribute('aria-checked', 'false');

        fireEvent.keyDown(kdgRadio, { key: 'ArrowRight' });

        expect(dsgvoRadio).toHaveAttribute('aria-checked', 'true');
        expect(kdgRadio).toHaveAttribute('aria-checked', 'false');
        expect(screen.getByText('Art. 26 Abs. 1 DSGVO')).toBeInTheDocument();

        fireEvent.keyDown(dsgvoRadio, { key: 'ArrowLeft' });

        expect(kdgRadio).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByText('§ 28 Abs. 1 S. 2 KDG')).toBeInTheDocument();
    });

    it('hides internal notes by default and reveals them on toggle', () => {
        render(<DpiaDocumentPage />);

        expect(screen.queryByText(/Dokumentationsstand/)).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Interne Anmerkungen/ }));

        expect(screen.getByText(/Dokumentationsstand/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Interne Anmerkungen/ }));

        expect(screen.queryByText(/Dokumentationsstand/)).not.toBeInTheDocument();
    });

    it('only renders chapter-nav links for chapters actually rendered on the page', () => {
        render(<DpiaDocumentPage />);

        expect(screen.getByRole('link', { name: /Kennzahlen/ })).toHaveAttribute('href', '#kap3');
        expect(screen.getByRole('link', { name: /Akteure & Rollen/ })).toHaveAttribute('href', '#kap4');
        expect(screen.getByRole('link', { name: /Technik/ })).toHaveAttribute('href', '#kap5');

        // Chapters not rendered as sections in this view must not be links.
        expect(screen.queryByRole('link', { name: /Scope/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Ergebnis/ })).not.toBeInTheDocument();
        expect(screen.getByText(/Scope/)).toHaveAttribute('aria-disabled', 'true');
    });

    it('labels the default key figures as sample data and can accept real, non-sample figures', () => {
        const { rerender } = render(<DpiaDocumentPage />);
        expect(screen.getByText('Beispieldaten')).toBeInTheDocument();

        rerender(<DpiaDocumentPage keyFigures={[{ value: '1', label: 'Träger' }]} keyFiguresAreSample={false} />);
        expect(screen.queryByText('Beispieldaten')).not.toBeInTheDocument();
    });
});
