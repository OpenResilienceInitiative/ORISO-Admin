import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LegalConsentField } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: unknown) => {
            if (typeof options === 'string') {
                return options;
            }
            if (options && typeof options === 'object') {
                return `${key}:${Object.values(options).join(':')}`;
            }
            return key;
        },
    }),
}));

describe('LegalConsentField — dialog (#862)', () => {
    it('starts closed with only the CTA — no panel below the card', () => {
        render(
            <LegalConsentField language="de" value="Ich habe {{legal_links}} gelesen." onChange={() => undefined} />,
        );

        expect(screen.getByTestId('consent-edit-trigger')).toBeInTheDocument();
        expect(screen.queryByTestId('consent-summary')).not.toBeInTheDocument();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(screen.queryByText('placeholderTemplate.dialog.legalTitle')).not.toBeInTheDocument();
    });

    it('opens the placeholder-template dialog on the CTA', async () => {
        render(
            <LegalConsentField language="de" value="Ich habe {{legal_links}} gelesen." onChange={() => undefined} />,
        );

        await userEvent.click(screen.getByTestId('consent-edit-trigger'));

        expect(screen.getByText('placeholderTemplate.dialog.legalTitle')).toBeInTheDocument();
        expect(screen.getByRole('textbox')).toHaveValue('Ich habe {{legal_links}} gelesen.');
        expect(screen.getByTestId('consent-fixed-addendum')).toBeInTheDocument();
    });

    it('puts the house checkbox in the dialog head', async () => {
        render(
            <LegalConsentField language="de" value="Ich habe {{legal_links}} gelesen." onChange={() => undefined} />,
        );

        await userEvent.click(screen.getByTestId('consent-edit-trigger'));

        expect(screen.getByTestId('legal-consent-head-icon')).toBeInTheDocument();
    });

    it('commits the draft on Save and closes', async () => {
        const onChange = vi.fn();
        render(<LegalConsentField language="de" value="Alt {{legal_links}}." onChange={onChange} />);

        await userEvent.click(screen.getByTestId('consent-edit-trigger'));
        const input = screen.getByRole('textbox');
        await userEvent.clear(input);
        await userEvent.click(input);
        (input as HTMLTextAreaElement).focus();
        await userEvent.paste('Neu {{legal_links}}.');
        await userEvent.click(screen.getByRole('button', { name: 'save' }));

        expect(onChange).toHaveBeenCalledWith('Neu {{legal_links}}.');
        expect(screen.queryByText('placeholderTemplate.dialog.legalTitle')).not.toBeInTheDocument();
    });

    it('discards the draft on Cancel', async () => {
        const onChange = vi.fn();
        render(<LegalConsentField language="de" value="Alt {{legal_links}}." onChange={onChange} />);

        await userEvent.click(screen.getByTestId('consent-edit-trigger'));
        const input = screen.getByRole('textbox');
        await userEvent.clear(input);
        await userEvent.click(input);
        await userEvent.paste('Verworfen {{legal_links}}.');
        await userEvent.click(screen.getByRole('button', { name: 'cancel' }));

        expect(onChange).not.toHaveBeenCalled();
        expect(screen.queryByText('placeholderTemplate.dialog.legalTitle')).not.toBeInTheDocument();
    });

    it('keeps Save disabled in read-only mode and does not commit', async () => {
        const onChange = vi.fn();
        render(<LegalConsentField language="de" readOnly value="Fest {{legal_links}}." onChange={onChange} />);

        expect(screen.getByTestId('consent-edit-trigger')).toHaveTextContent('legal.consent.viewButton');
        await userEvent.click(screen.getByTestId('consent-edit-trigger'));

        expect(screen.getByRole('textbox')).toBeDisabled();
        expect(screen.getByRole('button', { name: 'save' })).toBeDisabled();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('marks the CTA when the committed sentence lacks {{legal_links}}', () => {
        render(<LegalConsentField language="de" value="Ich stimme zu." onChange={() => undefined} />);

        expect(screen.getByTestId('consent-edit-trigger')).toHaveAttribute('data-missing-token', 'true');
    });

    it('shows the missing-token error inside the open dialog', async () => {
        render(<LegalConsentField language="de" value="Ich stimme zu." onChange={() => undefined} />);

        await userEvent.click(screen.getByTestId('consent-edit-trigger'));
        expect(screen.getByTestId('consent-missing-token-error')).toBeInTheDocument();
    });
});
