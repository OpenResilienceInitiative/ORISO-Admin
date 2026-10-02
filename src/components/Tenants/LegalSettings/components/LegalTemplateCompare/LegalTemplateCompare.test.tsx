import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { M3RichTextEditorProps } from '../../../../FormPluginEditor/M3RichTextEditor';
import { LegalTemplateCompare, LegalTemplateCompareProps } from './index';
import type { LegalTemplateProposal } from '../../hooks/useLegalProposalInbox';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
        i18n: { language: 'de' },
    }),
}));

vi.mock('../../../../DpaLegalForm/DpaLegalReader', () => ({
    DpaLegalReader: ({ html, testId }: { html: string; testId?: string }) => (
        <div data-testid={testId}>{html.replace(/<[^>]+>/g, '')}</div>
    ),
}));

const pending: LegalTemplateProposal = {
    id: 31,
    status: 'PENDING',
    revision: '31:0',
    createdAt: '2026-09-25T14:31:07',
    content: { de: '<p>Muster-Impressum der Plattform</p><script>alert(1)</script>' },
};

const MockEditor = ({ comparison, snackbarSlot }: Pick<M3RichTextEditorProps, 'comparison' | 'snackbarSlot'>) => (
    <div>
        <div data-testid="own-draft-editor">Eigener Entwurf</div>
        {comparison && (
            <button type="button" onClick={() => comparison.onOpenChange?.(!comparison.open)}>
                {comparison.open ? 'Vergleich schließen' : 'Vorlage vergleichen'}
            </button>
        )}
        {comparison?.open && (
            <aside aria-label={comparison.title}>
                <div data-testid="legal-template-reader">{comparison.html.replace(/<[^>]+>/g, '')}</div>
                {comparison.detail}
                {comparison.actions}
            </aside>
        )}
        {snackbarSlot}
    </div>
);

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
            <MockEditor />
        </LegalTemplateCompare>,
    );
    return { ...view, onAdopt, onDismiss };
};

describe('LegalTemplateCompare', () => {
    it('keeps the new-template notice inside the editor and opens one read-only reference', async () => {
        renderCompare();
        expect(screen.getByTestId('own-draft-editor')).toBeInTheDocument();
        expect(screen.getByText(/25\.09\.2026, 16:31/)).toBeInTheDocument();
        expect(screen.queryByTestId('legal-template-reader')).toBeNull();
        await userEvent.click(screen.getByRole('button', { name: 'legal.proposal.preview' }));
        const reader = screen.getByTestId('legal-template-reader');
        expect(reader).toHaveTextContent('Muster-Impressum der Plattform');
        expect(reader.querySelector('script')).toBeNull();
    });

    it('adopts into an empty draft only after opening the reference', async () => {
        const { onAdopt } = renderCompare();
        await userEvent.click(screen.getByRole('button', { name: 'Vorlage vergleichen' }));
        await userEvent.click(screen.getByRole('button', { name: 'legal.proposal.adopt' }));
        expect(onAdopt).toHaveBeenCalledWith('CREATE_IF_EMPTY');
    });

    it('asks before replacing a saved draft', async () => {
        const { onAdopt } = renderCompare({ hasDraft: true });
        await userEvent.click(screen.getByRole('button', { name: 'Vorlage vergleichen' }));
        await userEvent.click(screen.getByRole('button', { name: 'legal.proposal.adopt' }));
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('legal.proposal.replace.content')).toBeInTheDocument();
        expect(onAdopt).not.toHaveBeenCalled();
        await userEvent.click(within(dialog).getByRole('button', { name: 'legal.proposal.replace.confirm' }));
        await waitFor(() => expect(onAdopt).toHaveBeenCalledWith('ARCHIVE_AND_REPLACE'));
    });

    it('X hides only this visit; dismiss calls the publication-specific handler', async () => {
        const { onDismiss, unmount } = renderCompare();
        await userEvent.click(screen.getByRole('button', { name: 'legal.help.snackbar.close' }));
        expect(screen.queryByRole('button', { name: 'legal.proposal.preview' })).toBeNull();
        expect(onDismiss).not.toHaveBeenCalled();
        unmount();
        const second = renderCompare();
        expect(screen.getByRole('button', { name: 'legal.proposal.preview' })).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'legal.help.snackbar.dismiss' }));
        expect(second.onDismiss).toHaveBeenCalledTimes(1);
    });

    it('retains a dismissed publication for manual comparison without another notice', async () => {
        renderCompare({ proposal: { ...pending, status: 'DISMISSED' } });
        expect(screen.queryByRole('button', { name: 'legal.proposal.preview' })).toBeNull();
        await userEvent.click(screen.getByRole('button', { name: 'Vorlage vergleichen' }));
        expect(screen.getByTestId('legal-template-reader')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'legal.proposal.dismiss' })).toBeNull();
    });

    it('lets a read-only inspector preview without acknowledging the recipient’s offer', async () => {
        const { onDismiss } = renderCompare({ readOnly: true });
        expect(screen.queryByRole('button', { name: 'legal.help.snackbar.dismiss' })).toBeNull();
        await userEvent.click(screen.getByRole('button', { name: 'legal.proposal.preview' }));
        expect(screen.getByTestId('legal-template-reader')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'legal.proposal.dismiss' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'legal.proposal.adopt' })).toBeDisabled();
        expect(onDismiss).not.toHaveBeenCalled();
    });
    it('cancelling replacement leaves the saved draft alone', async () => {
        const { onAdopt } = renderCompare({ hasDraft: true });
        await userEvent.click(screen.getByRole('button', { name: 'Vorlage vergleichen' }));
        await userEvent.click(screen.getByRole('button', { name: 'legal.proposal.adopt' }));
        await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'cancel' }));
        expect(onAdopt).not.toHaveBeenCalled();
        expect(screen.getByTestId('own-draft-editor')).toHaveTextContent('Eigener Entwurf');
    });

    it('dismisses the reference without replacing or publishing the draft', async () => {
        const { onAdopt, onDismiss } = renderCompare({ hasDraft: true });
        await userEvent.click(screen.getByRole('button', { name: 'Vorlage vergleichen' }));
        await userEvent.click(screen.getByRole('button', { name: 'legal.proposal.dismiss' }));
        expect(onDismiss).toHaveBeenCalledOnce();
        expect(onAdopt).not.toHaveBeenCalled();
        expect(screen.getByTestId('own-draft-editor')).toHaveTextContent('Eigener Entwurf');
    });

    it('shows which Fachbereiche follow the agency-wide publication', async () => {
        renderCompare({
            source: 'traeger',
            proposal: { ...pending, departmentImpact: { affected: 3, notAffected: 1, notAffectedTopicIds: [12] } },
        });
        await userEvent.click(screen.getByRole('button', { name: 'legal.proposal.preview' }));
        const impact = screen.getByText(/legal.proposal.departmentImpact/);
        expect(impact).toHaveTextContent('"count":3');
        expect(impact).toHaveTextContent('"notAffected":1');
    });

    it('keeps replaced drafts readable when no received template remains', async () => {
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
        expect(within(await screen.findByRole('dialog')).getByTestId('legal-archive-reader')).toHaveTextContent(
            'Eigene Arbeit',
        );
    });

    it('renders only the existing editor when no template or archive exists', () => {
        renderCompare({ proposal: undefined });
        expect(screen.queryByRole('complementary')).toBeNull();
        expect(screen.queryByRole('button')).toBeNull();
        expect(screen.getByTestId('own-draft-editor')).toBeInTheDocument();
    });

    it('announces a new publication after the current one was temporarily closed', async () => {
        const { rerender } = renderCompare();
        await userEvent.click(screen.getByRole('button', { name: 'legal.help.snackbar.close' }));
        rerender(
            <LegalTemplateCompare
                proposal={{ ...pending, id: 32, revision: '32:0' }}
                source="platform"
                documentType="imprint"
                language="de"
                hasDraft={false}
                onAdopt={vi.fn()}
                onDismiss={vi.fn()}
            >
                <MockEditor />
            </LegalTemplateCompare>,
        );
        expect(screen.getByRole('button', { name: 'legal.proposal.preview' })).toBeInTheDocument();
    });
    it('names the fallback language when the requested language has no template', async () => {
        renderCompare({ language: 'en' });
        await userEvent.click(screen.getByRole('button', { name: 'legal.proposal.preview' }));
        expect(screen.getByText(/legal.proposal.otherLanguage/)).toHaveTextContent('"language":"de"');
    });
});
