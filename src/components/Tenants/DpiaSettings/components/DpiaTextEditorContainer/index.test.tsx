import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DpiaTextEditorContainer } from './index';
import type { DpiaTextDocument, DpiaTextGateway } from '../../api/dpiaTextGateway';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

// Same lightweight M3RichTextEditor stub DpiaTextEditor.test.tsx uses: TipTap is heavy and
// irrelevant here, only the save/publish wiring matters for these tests.
vi.mock('../../../../FormPluginEditor/M3RichTextEditor', () => ({
    M3RichTextEditor: ({
        value,
        onChange,
        onSaveDraft,
        topicSlot,
        belowSlot,
    }: {
        value?: string;
        onChange?: (html: string) => void;
        onSaveDraft?: (html: string) => void;
        topicSlot?: React.ReactNode;
        belowSlot?: React.ReactNode;
    }) => (
        <div data-testid="editor" data-value={value}>
            {topicSlot}
            {onChange && (
                <button type="button" onClick={() => onChange('<p>edited</p>')}>
                    edit
                </button>
            )}
            {onSaveDraft && (
                <button type="button" onClick={() => onSaveDraft(value)}>
                    saveDraft
                </button>
            )}
            {belowSlot}
        </div>
    ),
}));

/** A gateway whose `save` resolves only when the matching entry in `releasers` is called, so a
 * test can control exactly when a save "completes" relative to other actions (e.g. a tenant
 * switch). `load` always resolves immediately with a per-tenant document. */
const createControllableGateway = () => {
    const releasers: Record<number, (doc: DpiaTextDocument) => void> = {};
    const docs: Record<number, DpiaTextDocument> = {
        1: { texts: { governance: '<p>tenant-1</p>' }, statusBySection: {} },
        2: { texts: { governance: '<p>tenant-2</p>' }, statusBySection: {} },
    };
    const gateway: DpiaTextGateway = {
        load: async (tenantId) => docs[tenantId],
        save: (tenantId) =>
            new Promise((resolve) => {
                releasers[tenantId] = resolve;
            }),
    };
    return { gateway, docs, releaseSave: (tenantId: number, doc: DpiaTextDocument) => releasers[tenantId](doc) };
};

describe('DpiaTextEditorContainer tenant-switch save race', () => {
    it('ignores a save response for a tenant the admin has since switched away from', async () => {
        const user = userEvent.setup();
        const { gateway, docs, releaseSave } = createControllableGateway();

        const { rerender } = render(<DpiaTextEditorContainer tenantId={1} gateway={gateway} />);

        await screen.findByTestId('editor');
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'saveDraft' }));

        // Switch to tenant 2 BEFORE tenant 1's save resolves.
        rerender(<DpiaTextEditorContainer tenantId={2} gateway={gateway} />);
        await waitFor(() => expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>tenant-2</p>'));

        // Tenant 1's stale save now resolves with a document that must never reach the screen.
        releaseSave(1, { texts: { governance: '<p>STALE-TENANT-1-RESULT</p>' }, statusBySection: {} });

        // Give the resolved promise's .then a tick, then assert tenant 2's view is unchanged.
        await new Promise<void>((resolve) => {
            setTimeout(resolve, 0);
        });
        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', docs[2].texts.governance);
        expect(screen.queryByText('dpia.editor.saveError')).not.toBeInTheDocument();
    });
});
