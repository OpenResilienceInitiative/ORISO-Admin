import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InviteEmailTemplateEditor, type InviteEmailTemplateValues } from './InviteEmailTemplateEditor';
import { LegalConsentTemplateEditor } from './LegalConsentTemplateEditor';

const t = (key: string, fallback?: string) => fallback ?? key;

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t }),
}));

// The invite preview is rendered by the backend (see EmailKitPreview) — the
// editor's job is only to hand it the authored text unchanged.
const mocks = vi.hoisted(() => ({
    previewInviteEmailTemplateContent: vi.fn(),
}));

vi.mock('../../api/accountInvites/accountInvites', () => ({
    previewInviteEmailTemplateContent: mocks.previewInviteEmailTemplateContent,
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

/** The e-mail document the preview iframe renders (jsdom does not paint srcDoc). */
const previewDocument = (preview: HTMLElement): string => preview.querySelector('iframe')?.getAttribute('srcdoc') ?? '';

describe('InviteEmailTemplateEditor', () => {
    beforeEach(() => {
        mocks.previewInviteEmailTemplateContent.mockReset();
        mocks.previewInviteEmailTemplateContent.mockResolvedValue({
            templateId: null,
            templateName: null,
            kind: 'TENANT_INVITE',
            language: 'de',
            subject: 'Einladung für Maren',
            html: '<!doctype html><html><body>Hallo Maren,</body></html>',
            plainText: 'Hallo Maren,',
            sampleAcceptUrl: 'https://admin.example/tenant-onboarding/SAMPLE',
        });
    });

    // E2, second half: the editor used to substitute the sample values itself
    // and hand the *resolved* text to the preview. With the preview coming from
    // the send path's renderer that would put the author's view and the
    // recipient's mail back on two substitution implementations. The authored
    // text now travels raw and the backend resolves it once, for both.
    it('hands the authored text to the renderer raw, tokens unresolved', async () => {
        render(<InviteHarness />);

        await waitFor(() =>
            expect(mocks.previewInviteEmailTemplateContent).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: 'Einladung für {{firstName}}',
                    body: 'Hallo {{firstName}},\n{{inviteLink}}',
                }),
            ),
        );
    });

    it('shows the rendered mail, substituted by the backend', async () => {
        render(<InviteHarness />);
        const preview = screen.getByRole('region', { name: 'E-Mail-Vorschau' });

        await waitFor(() => expect(previewDocument(preview)).toContain('Hallo Maren,'));
        expect(previewDocument(preview)).not.toContain('{{firstName}}');
        expect(within(preview).getByText('Einladung für Maren')).toBeInTheDocument();
    });

    it('re-renders through the backend while typing, still raw', async () => {
        render(<InviteHarness />);
        const body = screen.getByRole('textbox', { name: 'Inhalt' });
        fireEvent.change(body, { target: { value: 'Guten Tag {{lastName}}!' } });

        await waitFor(() =>
            expect(mocks.previewInviteEmailTemplateContent).toHaveBeenCalledWith(
                expect.objectContaining({ body: 'Guten Tag {{lastName}}!' }),
            ),
        );
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
