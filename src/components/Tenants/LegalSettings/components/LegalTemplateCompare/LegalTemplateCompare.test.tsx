import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LegalTemplateCompare, LegalTemplateCompareProps } from './index';
import type { LegalTemplateProposal } from '../../hooks/useLegalProposalInbox';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
        i18n: { language: 'de' },
    }),
}));

// The canonical reader is a full read-only TipTap card; its own tests cover it.
vi.mock('../../../../DpaLegalForm/DpaLegalReader', () => ({
    DpaLegalReader: ({ html, label, testId }: { html: string; label: string; testId?: string }) => (
        // eslint-disable-next-line react/no-danger
        <div data-testid={testId} aria-label={label} dangerouslySetInnerHTML={{ __html: html }} />
    ),
}));

const pending: LegalTemplateProposal = {
    id: 31,
    status: 'PENDING',
    revision: '31:0',
    // Zoneless UTC on the wire: 14:31 UTC is 16:31 in Berlin (CEST).
    createdAt: '2026-09-25T14:31:07',
    content: { de: '<p>Muster-Impressum der Plattform</p><script>alert(1)</script>' },
};

const renderCompare = (props: Partial<LegalTemplateCompareProps> = {}) => {
    const onAdopt = vi.fn().mockResolvedValue(undefined);
    const onDismiss = vi.fn().mockResolvedValue(undefined);
    const view = render(
        <LegalTemplateCompare
            proposal={pending}
            source="platform"
            documentType="imprint"
            language="de"
            hasDraft={false}
            onAdopt={onAdopt}
            onDismiss={onDismiss}
            {...props}
        >
            <div data-testid="own-draft-editor">Eigener Entwurf</div>
        </LegalTemplateCompare>,
    );
    return { ...view, onAdopt, onDismiss };
};

describe('LegalTemplateCompare', () => {
    it('shows an unread template on the left, read-only, with source and Berlin send time, beside the own draft', () => {
        renderCompare();
        const region = screen.getByRole('region', { name: /legal.proposal.source.platform/ });
        expect(region).toHaveAttribute('data-legal-compare-open', 'true');
        expect(within(region).getByText('legal.proposal.new')).toBeInTheDocument();
        expect(within(region).getByText(/25\.09\.2026, 16:31/)).toBeInTheDocument();
        const reader = screen.getByTestId('legal-template-reader');
        expect(reader).toHaveTextContent('Muster-Impressum der Plattform');
        // Sanitised: a template is data, never script.
        expect(reader.querySelector('script')).toBeNull();
        expect(screen.getByTestId('own-draft-editor')).toBeInTheDocument();
    });

    it('adopts straight into an empty draft without asking', async () => {
        const { onAdopt } = renderCompare({ hasDraft: false });
        await userEvent.click(screen.getByRole('button', { name: 'legal.proposal.adopt' }));
        expect(onAdopt).toHaveBeenCalledWith('CREATE_IF_EMPTY');
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('asks before replacing an existing draft and names where the replaced draft stays readable', async () => {
        const { onAdopt } = renderCompare({ hasDraft: true });
        await userEvent.click(screen.getByRole('button', { name: 'legal.proposal.adopt' }));
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('legal.proposal.replace.content')).toBeInTheDocument();
        expect(onAdopt).not.toHaveBeenCalled();
        await userEvent.click(within(dialog).getByRole('button', { name: 'legal.proposal.replace.confirm' }));
        await waitFor(() => expect(onAdopt).toHaveBeenCalledWith('ARCHIVE_AND_REPLACE'));
    });

    it('cancelling the replace question changes nothing', async () => {
        const { onAdopt } = renderCompare({ hasDraft: true });
        await userEvent.click(screen.getByRole('button', { name: 'legal.proposal.adopt' }));
        await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'cancel' }));
        expect(onAdopt).not.toHaveBeenCalled();
    });

    it('dismisses without touching the draft', async () => {
        const { onAdopt, onDismiss } = renderCompare({ hasDraft: true });
        await userEvent.click(screen.getByRole('button', { name: 'legal.proposal.dismiss' }));
        expect(onDismiss).toHaveBeenCalledTimes(1);
        expect(onAdopt).not.toHaveBeenCalled();
        expect(screen.getByTestId('own-draft-editor')).toBeInTheDocument();
    });

    it('read-only: still shows the template and the lock reason, but adopt and dismiss are disabled', () => {
        renderCompare({ readOnly: true, readOnlyReason: 'Plattformweit gesperrt.' });
        expect(screen.getByTestId('legal-template-reader')).toHaveTextContent('Muster-Impressum der Plattform');
        expect(screen.getByText('Plattformweit gesperrt.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'legal.proposal.adopt' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'legal.proposal.dismiss' })).toBeDisabled();
    });

    it('a dismissed template stays reachable: closed by default, reopened on request', async () => {
        renderCompare({ proposal: { ...pending, status: 'DISMISSED' } });
        expect(screen.queryByTestId('legal-template-reader')).toBeNull();
        expect(screen.getByTestId('own-draft-editor')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'legal.proposal.show' }));
        expect(screen.getByTestId('legal-template-reader')).toBeInTheDocument();
        expect(screen.queryByText('legal.proposal.new')).toBeNull();
        expect(screen.queryByRole('button', { name: 'legal.proposal.dismiss' })).toBeNull();
    });

    it('collapses the template pane so the draft gets the room', async () => {
        renderCompare();
        const toggle = screen.getByRole('button', { name: 'legal.proposal.collapse' });
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await userEvent.click(toggle);
        expect(screen.queryByTestId('legal-template-reader')).toBeNull();
        expect(screen.getByRole('button', { name: 'legal.proposal.expand' })).toHaveAttribute('aria-expanded', 'false');
    });

    it('says how many Fachbereiche follow the agency text and how many keep their own', () => {
        renderCompare({
            source: 'traeger',
            proposal: { ...pending, departmentImpact: { affected: 3, notAffected: 1, notAffectedTopicIds: [12] } },
        });
        expect(screen.getByText(/legal.proposal.departmentImpact/)).toHaveTextContent('"count":3');
        expect(screen.getByText(/legal.proposal.departmentImpact/)).toHaveTextContent('"notAffected":1');
        expect(screen.getByRole('region', { name: /legal.proposal.source.traeger/ })).toBeInTheDocument();
    });

    it('keeps replaced drafts readable, even when no template is open', async () => {
        renderCompare({
            proposal: undefined,
            archives: [
                {
                    id: 9,
                    content: { de: '<p>Eigene Arbeit</p>' },
                    draftSavedAt: '2026-09-24T09:00:00',
                    archivedAt: '2026-09-25T14:40:00',
                },
            ],
        });
        await userEvent.click(screen.getByRole('button', { name: /legal.proposal.archives.open/ }));
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByTestId('legal-archive-reader')).toHaveTextContent('Eigene Arbeit');
    });

    it('renders only the editor when there is nothing to compare', () => {
        renderCompare({ proposal: undefined });
        expect(screen.queryByRole('region')).toBeNull();
        expect(screen.getByTestId('own-draft-editor')).toBeInTheDocument();
    });
});
