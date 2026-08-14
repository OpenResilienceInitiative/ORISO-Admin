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
        /** How many `save` calls the gateway has actually received for this tenant so far —
         * used to prove a second save was NOT dispatched while the first was still pending. */
        dispatchedCount: (tenantId: number) => (releasers[tenantId] ?? []).length,
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

    it('serializes overlapping saves: a second save is never dispatched while the first is pending', async () => {
        const user = userEvent.setup();
        const { gateway, releaseSave, dispatchedCount } = createControllableGateway();

        render(<DpiaTextEditorContainer tenantId={1} gateway={gateway} />);

        await screen.findByTestId('editor');
        // Deliberately no 'edit' click: DpiaTextEditor's own `edits` session state is never
        // cleared by a successful save, so an edited section would keep echoing the LOCAL edit
        // regardless of which save result the container applied, masking exactly what this test
        // checks. Saving without editing isolates the container's own guard.
        await user.click(screen.getByRole('button', { name: 'saveDraft' }));
        expect(dispatchedCount(1)).toBe(1);

        // A second click while the first is still in flight must NOT reach the gateway yet — a
        // second concurrent REQUEST is exactly what could persist out of order at the backend,
        // regardless of which RESPONSE the container later chooses to apply.
        await user.click(screen.getByRole('button', { name: 'saveDraft' }));
        expect(dispatchedCount(1)).toBe(1);

        // The first request settles, but its result must be discarded rather than briefly shown:
        // a newer save was already requested before this one settled, so it is stale the moment
        // it resolves.
        releaseSave(1, 0, { texts: { governance: '<p>FIRST-RESULT</p>' }, statusBySection: {} });
        await waitFor(() => expect(dispatchedCount(1)).toBe(2)); // only now does the queued follow-up dispatch
        expect(screen.getByTestId('editor')).not.toHaveAttribute('data-value', '<p>FIRST-RESULT</p>');

        // The queued follow-up (the admin's actual latest intent) settles and is what finally
        // reaches the screen.
        releaseSave(1, 1, { texts: { governance: '<p>SECOND-RESULT</p>' }, statusBySection: {} });
        await waitFor(() => expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>SECOND-RESULT</p>'));
    });

    it('blocks the chapter selector while a save is in flight, so its in-progress text cannot be discarded mid-save', async () => {
        const user = userEvent.setup();
        const { gateway, releaseSave } = createControllableGateway();

        render(<DpiaTextEditorContainer tenantId={1} gateway={gateway} />);

        await screen.findByTestId('editor');
        const chapterSelect = screen.getByRole('button', { name: 'dpia.sections.choose' });
        expect(chapterSelect).toBeEnabled();

        await user.click(screen.getByRole('button', { name: 'saveDraft' }));
        // A save's payload is fixed the moment it fires; switching chapters (and discarding
        // whatever the guard would otherwise offer to drop) cannot stop it from being persisted,
        // so the switch itself is blocked until the save settles.
        expect(chapterSelect).toBeDisabled();

        releaseSave(1, 0, { texts: { governance: '<p>saved</p>' }, statusBySection: {} });
        await waitFor(() => expect(chapterSelect).toBeEnabled());
    });
});
