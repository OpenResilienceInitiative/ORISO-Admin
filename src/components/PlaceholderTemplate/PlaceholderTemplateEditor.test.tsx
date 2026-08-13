import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InviteEmailTemplateEditor, type InviteEmailTemplateValues } from './InviteEmailTemplateEditor';
import { LegalConsentTemplateEditor } from './LegalConsentTemplateEditor';

const t = (key: string, fallback?: string) => fallback ?? key;

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t }),
}));

const inviteTemplates = [
    {
        id: 1,
        name: 'Standard-Einladung',
        values: { subject: 'Einladung für {{firstName}}', body: 'Hallo {{firstName}},\n{{inviteLink}}' },
    },
    {
        id: 2,
        name: 'Kurzfassung',
        values: { subject: 'Ihr Zugang', body: 'Link: {{inviteLink}}' },
    },
];

const InviteHarness = () => {
    const [values, setValues] = useState<InviteEmailTemplateValues>({
        subject: 'Einladung für {{firstName}}',
        body: 'Hallo {{firstName}},\n{{inviteLink}}',
    });
    const [activeTemplateId, setActiveTemplateId] = useState<number | string>(1);
    return (
        <InviteEmailTemplateEditor
            activeTemplateId={activeTemplateId}
            templates={inviteTemplates}
            values={values}
            onChange={setValues}
            onSelectTemplate={(id) => {
                setActiveTemplateId(id);
                const template = inviteTemplates.find((entry) => entry.id === id);
                if (template) {
                    setValues(template.values);
                }
            }}
            onCreateFromTemplate={() => {}}
        />
    );
};

describe('InviteEmailTemplateEditor', () => {
    it('substitutes sample values into the live preview', () => {
        render(<InviteHarness />);
        const preview = screen.getByRole('region', { name: 'E-Mail-Vorschau' });
        // firstName sample resolved, token no longer visible in the preview body.
        expect(within(preview).getAllByText(/Lisa/).length).toBeGreaterThan(0);
        expect(within(preview).queryByText('{{firstName}}')).not.toBeInTheDocument();
    });

    it('updates the preview live while typing', () => {
        render(<InviteHarness />);
        const body = screen.getByRole('textbox', { name: 'Inhalt' });
        fireEvent.change(body, { target: { value: 'Guten Tag {{lastName}}!' } });
        const preview = screen.getByRole('region', { name: 'E-Mail-Vorschau' });
        expect(within(preview).getByText(/Guten Tag Beispiel!/)).toBeInTheDocument();
    });

    it('keeps unknown tokens visible as {{key}} in the preview', () => {
        render(<InviteHarness />);
        const body = screen.getByRole('textbox', { name: 'Inhalt' });
        fireEvent.change(body, { target: { value: 'Hallo {{firstName}} und {{unbekannt}}' } });
        const preview = screen.getByRole('region', { name: 'E-Mail-Vorschau' });
        expect(within(preview).getByText('{{unbekannt}}')).toBeInTheDocument();
        expect(within(preview).queryByText('{{firstName}}')).not.toBeInTheDocument();
    });

    it('loads the picked template into the fields via the split button', async () => {
        const user = userEvent.setup();
        render(<InviteHarness />);
        await user.click(screen.getByRole('button', { name: 'Vorlagenmenü öffnen' }));
        await user.click(await screen.findByRole('menuitem', { name: /^Kurzfassung$/ }));
        expect(screen.getByRole('textbox', { name: 'Betreff' })).toHaveValue('Ihr Zugang');
        expect(screen.getByRole('textbox', { name: 'Inhalt' })).toHaveValue('Link: {{inviteLink}}');
        expect(screen.getByRole('button', { name: /Kurzfassung/ })).toBeInTheDocument();
    });
});

const LegalHarness = () => {
    const [values, setValues] = useState({
        text: 'Ich habe die {{legal_links}} der {{Beratungsstelle}} zum Thema {{Thema}} zur Kenntnis genommen.',
    });
    return (
        <LegalConsentTemplateEditor
            activeTemplateId={1}
            templates={[{ id: 1, name: 'Registrierung', values }]}
            values={values}
            onChange={setValues}
            onSelectTemplate={() => {}}
        />
    );
};

describe('LegalConsentTemplateEditor', () => {
    it('renders the consent preview as a checkbox label with substituted samples', () => {
        render(<LegalHarness />);
        const preview = screen.getByRole('region', { name: 'Vorschau der Einwilligung' });
        expect(within(preview).getByRole('checkbox')).toBeInTheDocument();
        expect(within(preview).getByText(/Beratungsstelle Mainz-Neustadt/)).toBeInTheDocument();
        expect(within(preview).queryByText('{{Beratungsstelle}}')).not.toBeInTheDocument();
    });

    it('updates the consent preview live while typing', () => {
        render(<LegalHarness />);
        const field = screen.getByRole('textbox', { name: 'Einwilligungstext' });
        fireEvent.change(field, { target: { value: 'Neuer Satz über {{Thema}} und {{offen}}.' } });
        const preview = screen.getByRole('region', { name: 'Vorschau der Einwilligung' });
        expect(within(preview).getByText(/Neuer Satz über Suchtberatung/)).toBeInTheDocument();
        expect(within(preview).getByText('{{offen}}')).toBeInTheDocument();
    });
});
