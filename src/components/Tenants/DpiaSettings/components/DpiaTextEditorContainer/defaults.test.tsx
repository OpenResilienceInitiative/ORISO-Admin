import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DpiaTextEditorContainer } from './index';
import type { DpiaTextGateway } from '../../api/dpiaTextGateway';
import { DSFA_EDITOR_DEFAULTS } from '../../utils/dpiaDefaults';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../../../FormPluginEditor/M3RichTextEditor', () => ({
    M3RichTextEditor: ({
        value,
        onSaveDraft,
        topicSlot,
        belowSlot,
    }: {
        value?: string;
        onSaveDraft?: (html: string) => void;
        topicSlot?: React.ReactNode;
        belowSlot?: React.ReactNode;
    }) => (
        <div data-testid="editor" data-value={value}>
            {topicSlot}
            {onSaveDraft && (
                <button type="button" onClick={() => onSaveDraft(value)}>
                    saveDraft
                </button>
            )}
            {belowSlot}
        </div>
    ),
}));

describe('DpiaTextEditorContainer default drafts', () => {
    it('opens an untouched slot with the pre-filled draft instead of an empty editor', async () => {
        const gateway: DpiaTextGateway = {
            load: async () => ({ texts: {}, statusBySection: {} }),
            save: async (_id, texts) => ({ texts, statusBySection: {} }),
        };
        render(<DpiaTextEditorContainer tenantId={1} gateway={gateway} />);
        const editor = await screen.findByTestId('editor');
        expect(editor.getAttribute('data-value')).toBe(DSFA_EDITOR_DEFAULTS.governance);
    });

    it('keeps stored operator text and does not persist an untouched default on save', async () => {
        const saved: Array<Record<string, string>> = [];
        const gateway: DpiaTextGateway = {
            load: async () => ({ texts: { governance: '<p>Unser Gremium</p>' }, statusBySection: {} }),
            save: async (_id, texts) => {
                saved.push(texts);
                return { texts, statusBySection: {} };
            },
        };
        render(<DpiaTextEditorContainer tenantId={1} gateway={gateway} />);
        const editor = await screen.findByTestId('editor');
        expect(editor.getAttribute('data-value')).toBe('<p>Unser Gremium</p>');

        await userEvent.click(screen.getByText('saveDraft'));
        await waitFor(() => expect(saved).toHaveLength(1));
        expect(saved[0].governance).toBe('<p>Unser Gremium</p>');
        // Every other slot rode along as an untouched default and must arrive empty.
        Object.entries(saved[0])
            .filter(([id]) => id !== 'governance')
            .forEach(([, html]) => expect(html).toBe(''));
    });
});
