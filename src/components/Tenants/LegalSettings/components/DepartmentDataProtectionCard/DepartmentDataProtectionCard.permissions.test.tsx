import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DepartmentDataProtectionCard } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        i18n: { language: 'de' },
        t: (key: string, options?: unknown) => (typeof options === 'string' ? options : key),
    }),
}));

// The real editor pulls TipTap; this stub exposes exactly the part of the contract
// the gate is about — whether the write actions are offered and whether it is inert.
vi.mock('../../../../FormPluginEditor/M3RichTextEditor', () => ({
    M3RichTextEditor: ({
        value,
        readOnly,
        onChange,
        onPublish,
        onSaveDraft,
        topicSlot,
        aboveEditorSlot,
        belowSlot,
    }: {
        value?: string;
        readOnly?: boolean;
        onChange?: (html: string) => void;
        onPublish?: () => void;
        onSaveDraft?: () => void;
        topicSlot?: React.ReactNode;
        aboveEditorSlot?: React.ReactNode;
        belowSlot?: React.ReactNode;
    }) => (
        <div data-testid="editor" data-readonly={String(!!readOnly)} data-editable={String(!!onChange)}>
            {aboveEditorSlot}
            {onPublish && (
                <button type="button" onClick={onPublish}>
                    publish
                </button>
            )}
            {onSaveDraft && (
                <button type="button" onClick={onSaveDraft}>
                    saveDraft
                </button>
            )}
            {topicSlot}
            {belowSlot}
            <span>{value}</span>
        </div>
    ),
}));

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => undefined,
            removeListener: () => undefined,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            dispatchEvent: () => false,
        }),
    });
});

const renderCard = (readOnly: boolean) =>
    render(
        <DepartmentDataProtectionCard
            consentByLanguage={{ de: 'Ich habe die {{legal_links}} gelesen.' }}
            initialContentByLanguage={{ de: '<p>Fachbereichs-Richtlinie</p>' }}
            languages={['de']}
            readOnly={readOnly}
            onSave={() => undefined}
        />,
    );

/**
 * #609: the Fachbereich data-protection editor shipped with no permission check at
 * all — any admin who owned the agency could publish a policy. These assertions are
 * about what an admin WITHOUT the legal-text right is offered.
 */
describe('DepartmentDataProtectionCard — legal-text permission gate', () => {
    it('offers publish and draft-save to an admin who may change legal content', () => {
        renderCard(false);
        expect(screen.getByRole('button', { name: 'publish' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'saveDraft' })).toBeInTheDocument();
        expect(screen.getByTestId('editor')).toHaveAttribute('data-editable', 'true');
    });

    it('offers neither write action to an admin who may not', () => {
        renderCard(true);
        expect(screen.queryByRole('button', { name: 'publish' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'saveDraft' })).not.toBeInTheDocument();
    });

    it('hands the editor its own read-only state rather than only withholding the callbacks', () => {
        renderCard(true);
        const editor = screen.getByTestId('editor');
        expect(editor).toHaveAttribute('data-readonly', 'true');
        expect(editor).toHaveAttribute('data-editable', 'false');
    });

    it('makes the consent sentence inert too — it is published with the policy', async () => {
        renderCard(true);
        await userEvent.click(screen.getByTestId('consent-edit-trigger'));
        expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('still shows the document, so a viewer can read what the Fachbereich has', () => {
        renderCard(true);
        expect(screen.getByText('<p>Fachbereichs-Richtlinie</p>')).toBeInTheDocument();
    });
});
