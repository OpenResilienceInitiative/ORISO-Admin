import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlaceholderTextField } from './PlaceholderTextField';
import { INVITE_EMAIL_TOKENS } from './placeholderTokens';

const t = (key: string, fallback?: string) => fallback ?? key;

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t }),
}));

/** Controlled harness — the field is presentational and never owns its value. */
const Harness = ({ multiline = false, initialValue = '' }: { multiline?: boolean; initialValue?: string }) => {
    const [value, setValue] = useState(initialValue);
    return (
        <PlaceholderTextField
            label="Inhalt"
            multiline={multiline}
            tokens={INVITE_EMAIL_TOKENS}
            value={value}
            onChange={setValue}
        />
    );
};

describe('PlaceholderTextField', () => {
    it('renders a labelled input carrying the value', () => {
        render(<Harness initialValue="Hallo" />);
        expect(screen.getByRole('textbox', { name: 'Inhalt' })).toHaveValue('Hallo');
    });

    it('renders a textarea in multiline mode', () => {
        render(<Harness multiline initialValue="Hallo" />);
        expect(screen.getByRole('textbox', { name: 'Inhalt' }).tagName).toBe('TEXTAREA');
    });

    it('offers every token in the picker menu with its human label', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(screen.getByRole('button', { name: 'Platzhalter einfügen' }));
        expect(await screen.findByRole('menuitem', { name: /Vorname/ })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /E-Mail-Adresse/ })).toBeInTheDocument();
    });

    it('inserts {{key}} at the caret when a token is picked', async () => {
        const user = userEvent.setup();
        render(<Harness multiline initialValue="Hallo , willkommen." />);
        const textarea = screen.getByRole('textbox', { name: 'Inhalt' }) as HTMLTextAreaElement;
        // Put the caret right after "Hallo ".
        textarea.focus();
        textarea.setSelectionRange(6, 6);
        await user.click(screen.getByRole('button', { name: 'Platzhalter einfügen' }));
        await user.click(await screen.findByRole('menuitem', { name: /Vorname/ }));
        expect(textarea).toHaveValue('Hallo {{firstName}}, willkommen.');
    });

    it('replaces the selected range when text is selected', async () => {
        const user = userEvent.setup();
        render(<Harness multiline initialValue="Hallo NAME, willkommen." />);
        const textarea = screen.getByRole('textbox', { name: 'Inhalt' }) as HTMLTextAreaElement;
        textarea.focus();
        textarea.setSelectionRange(6, 10);
        await user.click(screen.getByRole('button', { name: 'Platzhalter einfügen' }));
        await user.click(await screen.findByRole('menuitem', { name: /Vorname/ }));
        expect(textarea).toHaveValue('Hallo {{firstName}}, willkommen.');
    });

    it('appends at the end when the field was never focused', async () => {
        const user = userEvent.setup();
        render(<Harness initialValue="Link: " />);
        await user.click(screen.getByRole('button', { name: 'Platzhalter einfügen' }));
        await user.click(await screen.findByRole('menuitem', { name: /Vorname/ }));
        expect(screen.getByRole('textbox', { name: 'Inhalt' })).toHaveValue('Link: {{firstName}}');
    });

    it('propagates typing through onChange', () => {
        render(<Harness />);
        const input = screen.getByRole('textbox', { name: 'Inhalt' });
        fireEvent.change(input, { target: { value: 'Neuer Text' } });
        expect(input).toHaveValue('Neuer Text');
    });
});
