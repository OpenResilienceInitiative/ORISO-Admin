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
        consentSlot,
        topicSlot,
        aboveEditorSlot,
        belowSlot,
    }: {
        value?: string;
        readOnly?: boolean;
        onChange?: (html: string) => void;
        onPublish?: () => void;
        onSaveDraft?: () => void;
        consentSlot?: React.ReactNode;
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
            {consentSlot}
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

const renderCard = (props: Partial<React.ComponentProps<typeof DepartmentDataProtectionCard>> = {}) =>
    render(
        <DepartmentDataProtectionCard
            initialContentByLanguage={{ de: '<p>Eigener Text</p>' }}
            languages={['de']}
            publicationStatus="PUBLISHED"
            onSave={() => undefined}
            {...props}
        />,
    );

/**
 * ORISO-Admin#916: a Fachbereich that left the inherited text can go back to it. The own live text
 * is cleared, so the action sits behind a warning the admin has to confirm.
 */
describe('DepartmentDataProtectionCard — revert to inherited text', () => {
    it('offers no revert action when the container passes none', () => {
        renderCard();
        expect(screen.queryByTestId('legal-revert-to-inherited')).not.toBeInTheDocument();
    });

    it('asks before clearing and does not revert on cancel', async () => {
        const onRevert = vi.fn().mockResolvedValue(undefined);
        renderCard({ onRevertToInherited: onRevert });

        await userEvent.click(screen.getByTestId('legal-revert-to-inherited'));
        expect(screen.getByText('legal.revert.description')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'legal.revert.cancel' }));

        expect(onRevert).not.toHaveBeenCalled();
        expect(screen.queryByText('legal.revert.description')).not.toBeInTheDocument();
    });

    it('reverts once the admin confirms the warning', async () => {
        const onRevert = vi.fn().mockResolvedValue(undefined);
        renderCard({ onRevertToInherited: onRevert });

        await userEvent.click(screen.getByTestId('legal-revert-to-inherited'));
        await userEvent.click(screen.getByRole('button', { name: 'legal.revert.confirm' }));

        expect(onRevert).toHaveBeenCalledTimes(1);
    });

    it('keeps the action inert for an admin who may not change legal content', () => {
        renderCard({ onRevertToInherited: vi.fn(), readOnly: true });
        expect(screen.queryByTestId('legal-revert-to-inherited')).not.toBeInTheDocument();
    });
});
