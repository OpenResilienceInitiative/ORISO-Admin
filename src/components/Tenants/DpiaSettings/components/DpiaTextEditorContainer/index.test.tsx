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
 * switch, or a second overlapping save). Calls for the same tenant queue up in order, so the
 * Nth `save` call for a tenant is released by `releaseSave(tenantId, N)`. `load` always resolves
 * immediately with a per-tenant document. */
const createControllableGateway = () => {
    const releasers: Record<number, Array<(doc: DpiaTextDocument) => void>> = {};
    const docs: Record<number, DpiaTextDocument> = {
        1: { texts: { governance: '<p>tenant-1</p>' }, statusBySection: {} },
        2: { texts: { governance: '<p>tenant-2</p>' }, statusBySection: {} },
    };
    const gateway: DpiaTextGateway = {
        load: async (tenantId) => docs[tenantId],
        save: (tenantId) =>
            new Promise((resolve) => {
                (releasers[tenantId] ??= []).push(resolve);
            }),
    };
    return {
        gateway,
        docs,
        releaseSave: (tenantId: number, callIndex: number, doc: DpiaTextDocument) =>
            releasers[tenantId][callIndex](doc),
    };
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
        releaseSave(1, 0, { texts: { governance: '<p>STALE-TENANT-1-RESULT</p>' }, statusBySection: {} });

        // Give the resolved promise's .then a tick, then assert tenant 2's view is unchanged.
        await new Promise<void>((resolve) => {
            setTimeout(resolve, 0);
        });
        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', docs[2].texts.governance);
        expect(screen.queryByText('dpia.editor.saveError')).not.toBeInTheDocument();
    });

    it('ignores an older overlapping save for the SAME tenant that resolves after a newer one', async () => {
        const user = userEvent.setup();
        const { gateway, releaseSave } = createControllableGateway();

        render(<DpiaTextEditorContainer tenantId={1} gateway={gateway} />);

        await screen.findByTestId('editor');
        // Deliberately no 'edit' click: DpiaTextEditor's own `edits` session state is never
        // cleared by a successful save, so an edited section would keep echoing the LOCAL edit
        // regardless of which save result the container applied, masking exactly the race this
        // test exists to catch. Saving without editing isolates the container's own guard.
        //
        // Fire two overlapping draft saves for the same tenant (e.g. a retry click racing the
        // original request — the M3 shell disables the button while saving, but the container
        // must not rely on that alone).
        await user.click(screen.getByRole('button', { name: 'saveDraft' }));
        await user.click(screen.getByRole('button', { name: 'saveDraft' }));

        // The NEWER (second) save resolves first...
        releaseSave(1, 1, { texts: { governance: '<p>NEWER-RESULT</p>' }, statusBySection: {} });
        await waitFor(() => expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>NEWER-RESULT</p>'));

        // ...then the OLDER (first) save resolves last. Its result must be discarded, not applied
        // over the newer one.
        releaseSave(1, 0, { texts: { governance: '<p>STALE-OLDER-RESULT</p>' }, statusBySection: {} });
        await new Promise<void>((resolve) => {
            setTimeout(resolve, 0);
        });
        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>NEWER-RESULT</p>');
    });
});
