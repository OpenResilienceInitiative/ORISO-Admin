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
    }) => {
        // Each 'edit' click produces DISTINCT content (edited-1, edited-2, ...) instead of a
        // fixed string, so a test can prove a queued save carries the LATEST edit rather than
        // merely re-sending whatever the first call happened to capture.
        const editCount = React.useRef(0);
        return (
            <div data-testid="editor" data-value={value}>
                {topicSlot}
                {onChange && (
                    <button
                        type="button"
                        onClick={() => {
                            editCount.current += 1;
                            onChange(`<p>edited-${editCount.current}</p>`);
                        }}
                    >
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
        );
    },
}));

/** A gateway whose `save` resolves only when the matching entry in `releasers` is called, so a
 * test can control exactly when a save "completes" relative to other actions (e.g. a tenant
 * switch, or a second overlapping save). Calls for the same tenant queue up in order, so the
 * Nth `save` call for a tenant is released by `releaseSave(tenantId, N)`. `load` always resolves
 * immediately with a per-tenant document. */
const createControllableGateway = () => {
    const releasers: Record<number, Array<(doc: DpiaTextDocument) => void>> = {};
    const savedArgs: Record<number, Array<{ texts: Record<string, string>; publish: boolean }>> = {};
    const docs: Record<number, DpiaTextDocument> = {
        1: { texts: { governance: '<p>tenant-1</p>' }, statusBySection: {} },
        2: { texts: { governance: '<p>tenant-2</p>' }, statusBySection: {} },
        3: { texts: { governance: '<p>tenant-3</p>' }, statusBySection: {} },
    };
    const gateway: DpiaTextGateway = {
        load: async (tenantId) => docs[tenantId],
        save: (tenantId, texts, publish) =>
            new Promise((resolve) => {
                (savedArgs[tenantId] ??= []).push({ texts, publish });
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
        /** The exact texts/publish arguments a dispatched `save` call received, by call index —
         * used to prove a queued call carries the LATEST content, not a replay of the first. */
        dispatchedArgs: (tenantId: number, callIndex: number) => savedArgs[tenantId][callIndex],
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

    it('serializes overlapping saves: a second save is never dispatched while the first is pending, and carries the latest content', async () => {
        const user = userEvent.setup();
        const { gateway, releaseSave, dispatchedCount, dispatchedArgs } = createControllableGateway();

        render(<DpiaTextEditorContainer tenantId={1} gateway={gateway} />);

        await screen.findByTestId('editor');
        const editButton = screen.getByRole('button', { name: 'edit' });
        const saveDraftButton = screen.getByRole('button', { name: 'saveDraft' });

        // First edit + save: dispatches immediately with editedContent #1.
        await user.click(editButton);
        await user.click(saveDraftButton);
        expect(dispatchedCount(1)).toBe(1);
        expect(dispatchedArgs(1, 0).texts.governance).toBe('<p>edited-1</p>');

        // A second, DIFFERENT edit + save while the first is still in flight must not reach the
        // gateway yet — a second concurrent REQUEST is exactly what could persist out of order at
        // the backend, regardless of which RESPONSE the container later chooses to apply. A queue
        // that simply replayed the first call's payload would pass a same-content test but fail
        // this one, since the content differs.
        await user.click(editButton);
        await user.click(saveDraftButton);
        expect(dispatchedCount(1)).toBe(1);

        // The first request settles, but its result must be discarded rather than briefly shown:
        // a newer save was already requested before this one settled, so it is stale the moment
        // it resolves.
        releaseSave(1, 0, { texts: { governance: '<p>FIRST-RESULT</p>' }, statusBySection: {} });
        await waitFor(() => expect(dispatchedCount(1)).toBe(2)); // only now does the queued follow-up dispatch
        expect(screen.getByTestId('editor')).not.toHaveAttribute('data-value', '<p>FIRST-RESULT</p>');
        // The follow-up request carries editedContent #2 — the admin's actual latest intent, not
        // a repeat of the first call's payload.
        expect(dispatchedArgs(1, 1).texts.governance).toBe('<p>edited-2</p>');

        // That follow-up settles cleanly: no third request gets queued/dispatched, no error
        // surfaced. (The editor's own `edits` state — deliberately never cleared by a successful
        // save, see the other test above — would keep echoing editedContent #2 regardless of the
        // resolved document, so that isn't asserted here; the request-content correctness above
        // already proves the queue carried the latest edit.) Wait on a real settlement signal —
        // the chapter selector re-enabling, which only happens once `saving` flips back to false
        // — instead of an arbitrary zero-delay timer.
        releaseSave(1, 1, { texts: { governance: '<p>SECOND-RESULT</p>' }, statusBySection: {} });
        await waitFor(() => expect(screen.getByRole('button', { name: 'dpia.sections.choose' })).toBeEnabled());
        expect(dispatchedCount(1)).toBe(2);
        expect(screen.queryByText('dpia.editor.saveError')).not.toBeInTheDocument();
    });

    it("does not let a THIRD tenant's save discard a save still queued for a different, in-between tenant", async () => {
        // A save chain shared across all tenants (a single "queued" slot, replaced by any newer
        // request) would let switching A -> B -> C silently drop B's queued save the moment C
        // saves, since C's request would overwrite the shared slot instead of only ever competing
        // with another A or another C request. Each tenant must own its own chain.
        const user = userEvent.setup();
        const { gateway, releaseSave, dispatchedCount } = createControllableGateway();

        const { rerender } = render(<DpiaTextEditorContainer tenantId={1} gateway={gateway} />);
        await screen.findByTestId('editor');
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'saveDraft' }));
        expect(dispatchedCount(1)).toBe(1); // tenant A's save is now in flight

        // Switch to tenant 2 (id doubles as a distinct "tenant B") and fire its own save while
        // A's is still pending.
        rerender(<DpiaTextEditorContainer tenantId={2} gateway={gateway} />);
        await waitFor(() => expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>tenant-2</p>'));
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'saveDraft' }));
        expect(dispatchedCount(2)).toBe(1); // tenant B's own chain dispatches immediately

        // Switch again, to a third tenant, and save there too.
        rerender(<DpiaTextEditorContainer tenantId={3} gateway={gateway} />);
        await waitFor(() => expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>tenant-3</p>'));
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'saveDraft' }));

        // Tenant B's save must still have reached its own gateway call — untouched by tenant C.
        expect(dispatchedCount(2)).toBe(1);
        expect(dispatchedCount(3)).toBe(1);

        // Clean up the still-pending requests so they don't leak into other tests.
        releaseSave(1, 0, { texts: { governance: '<p>a-done</p>' }, statusBySection: {} });
        releaseSave(2, 0, { texts: { governance: '<p>b-done</p>' }, statusBySection: {} });
        releaseSave(3, 0, { texts: { governance: '<p>c-done</p>' }, statusBySection: {} });
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
