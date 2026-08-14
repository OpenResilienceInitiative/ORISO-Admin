import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DpiaTextEditor } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: unknown) => {
            if (typeof options === 'string') {
                return options;
            }
            if (options && typeof options === 'object') {
                return `${key}:${Object.values(options).join(':')}`;
            }
            return key;
        },
    }),
}));

// TipTap pulls heavy editor deps; stub the M3 shell to a plain node mirroring its contract:
// echo the value, render the slots (topicSlot carries the chapter split button), let the test
// emit an edit, and expose the publish/draft actions.
vi.mock('../../../../FormPluginEditor/M3RichTextEditor', () => ({
    M3RichTextEditor: ({
        value,
        onChange,
        publishing,
        onPublish,
        onSaveDraft,
        topicSlot,
        helpSlot,
        belowSlot,
    }: {
        value?: string;
        onChange?: (html: string) => void;
        publishing?: boolean;
        onPublish?: (html: string) => void;
        onSaveDraft?: (html: string) => void;
        topicSlot?: React.ReactNode;
        helpSlot?: React.ReactNode;
        belowSlot?: React.ReactNode;
    }) => (
        <div data-testid="editor" data-value={value}>
            {topicSlot}
            {helpSlot}
            {onChange && (
                <button type="button" onClick={() => onChange('<p>edited</p>')}>
                    edit
                </button>
            )}
            {onPublish && (
                <button type="button" disabled={publishing} onClick={() => onPublish(value)}>
                    publish
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

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });

    // antd's dropdown portal (rc-util scroll locker) calls the two-arg
    // getComputedStyle(el, pseudoEl) which jsdom does not implement.
    const originalGetComputedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element) => originalGetComputedStyle(el));
});

const openChapterMenu = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: 'dpia.sections.choose' }));
};

const editorValue = () => screen.getByTestId('editor').getAttribute('data-value');

describe('DpiaTextEditor split-button chapter navigation', () => {
    it('opens on chapter 4 and labels the split button with chapter number and short title', () => {
        render(<DpiaTextEditor onSave={vi.fn()} />);

        expect(screen.getByRole('button', { name: 'dpia.sections.choose' })).toHaveTextContent(
            '4 dpia.sections.governance.title',
        );
    });

    it('switches the edited text when a chapter is picked from the dropdown', async () => {
        const user = userEvent.setup();
        render(
            <DpiaTextEditor
                onSave={vi.fn()}
                initialTexts={{ governance: '<p>governance</p>', escalationChain: '<p>escalation</p>' }}
            />,
        );

        expect(editorValue()).toBe('<p>governance</p>');

        await openChapterMenu(user);
        await user.click(await screen.findByText(/8\.11 dpia\.sections\.escalationChain\.title/));

        expect(editorValue()).toBe('<p>escalation</p>');
    });

    it('offers all eleven free-text slots, with the four chapter 9 stages under one heading', async () => {
        const user = userEvent.setup();
        render(<DpiaTextEditor onSave={vi.fn()} />);

        await openChapterMenu(user);

        expect(await screen.findByText('dpia.sections.group.proportionality')).toBeInTheDocument();
        // Chapter 9 is the four-stage proportionality test.
        expect(screen.getByText(/9\.1 /)).toBeInTheDocument();
        expect(screen.getByText(/9\.4 /)).toBeInTheDocument();
        // The annex carries no chapter number — its title already names it.
        expect(screen.getByText('dpia.sections.annexIndex.title')).toBeInTheDocument();
    });

    it('marks chapters that already carry text', async () => {
        const user = userEvent.setup();
        render(<DpiaTextEditor onSave={vi.fn()} initialTexts={{ escalationChain: '<p>escalation</p>' }} />);

        await openChapterMenu(user);

        expect(await screen.findByText(/8\.11 dpia\.sections\.escalationChain\.title •/)).toBeInTheDocument();
        expect(screen.getByText(/8\.3 dpia\.sections\.informationChannels\.title$/)).toBeInTheDocument();
    });
});

describe('DpiaTextEditor unsaved-changes guard', () => {
    const editThenSwitch = async (user: ReturnType<typeof userEvent.setup>) => {
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await openChapterMenu(user);
        await user.click(await screen.findByText(/8\.11 dpia\.sections\.escalationChain\.title/));
    };

    it('does not switch immediately when the current chapter is dirty', async () => {
        const user = userEvent.setup();
        render(<DpiaTextEditor onSave={vi.fn()} initialTexts={{ governance: '<p>governance</p>' }} />);

        await editThenSwitch(user);

        expect(await screen.findByText('dpia.editor.guard.description')).toBeInTheDocument();
        // Still on chapter 4, showing the edit.
        expect(editorValue()).toBe('<p>edited</p>');
    });

    it('cancelling the guard keeps the chapter and the edit', async () => {
        const user = userEvent.setup();
        render(<DpiaTextEditor onSave={vi.fn()} initialTexts={{ governance: '<p>governance</p>' }} />);

        await editThenSwitch(user);
        await user.click(await screen.findByRole('button', { name: 'dpia.editor.guard.cancel' }));

        expect(editorValue()).toBe('<p>edited</p>');
    });

    it('discarding drops only the current chapter edit and switches', async () => {
        const user = userEvent.setup();
        render(
            <DpiaTextEditor
                onSave={vi.fn()}
                initialTexts={{ governance: '<p>governance</p>', escalationChain: '<p>escalation</p>' }}
            />,
        );

        await editThenSwitch(user);
        await user.click(await screen.findByRole('button', { name: 'dpia.editor.guard.discard' }));

        expect(editorValue()).toBe('<p>escalation</p>');

        // Going back shows the ORIGINAL text — the edit was discarded, not kept.
        await openChapterMenu(user);
        await user.click(await screen.findByText(/^4 dpia\.sections\.governance\.title/));
        expect(editorValue()).toBe('<p>governance</p>');
    });

    it('save-and-switch persists a draft with the complete text map, then switches', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <DpiaTextEditor
                onSave={onSave}
                initialTexts={{ governance: '<p>governance</p>', escalationChain: '<p>escalation</p>' }}
            />,
        );

        await editThenSwitch(user);
        await user.click(await screen.findByRole('button', { name: 'dpia.editor.guard.save' }));

        expect(onSave).toHaveBeenCalledWith(
            { governance: '<p>edited</p>', escalationChain: '<p>escalation</p>' },
            false,
        );
        expect(editorValue()).toBe('<p>escalation</p>');
    });

    it('switches without a guard when the chapter is untouched', async () => {
        const user = userEvent.setup();
        render(
            <DpiaTextEditor
                onSave={vi.fn()}
                initialTexts={{ governance: '<p>governance</p>', escalationChain: '<p>escalation</p>' }}
            />,
        );

        await openChapterMenu(user);
        await user.click(await screen.findByText(/8\.11 dpia\.sections\.escalationChain\.title/));

        expect(screen.queryByText('dpia.editor.guard.description')).not.toBeInTheDocument();
        expect(editorValue()).toBe('<p>escalation</p>');
    });

    it('publish sends the complete map with publish=true', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(<DpiaTextEditor onSave={onSave} initialTexts={{ governance: '<p>governance</p>' }} />);

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'publish' }));

        expect(onSave).toHaveBeenCalledWith({ governance: '<p>edited</p>' }, true);
    });

    it('read-only mode offers neither editing nor the publish actions', () => {
        render(<DpiaTextEditor onSave={vi.fn()} initialTexts={{ governance: '<p>governance</p>' }} readOnly />);

        expect(screen.queryByRole('button', { name: 'edit' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'publish' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'saveDraft' })).not.toBeInTheDocument();
        // Nothing can ever get dirty in read-only mode, so the unsaved-changes guard must never render.
        expect(screen.queryByText('dpia.editor.guard.description')).not.toBeInTheDocument();
    });

    it('read-only mode still allows reading another chapter', async () => {
        const user = userEvent.setup();
        render(
            <DpiaTextEditor
                onSave={vi.fn()}
                initialTexts={{ governance: '<p>governance</p>', escalationChain: '<p>escalation</p>' }}
                readOnly
            />,
        );

        expect(editorValue()).toBe('<p>governance</p>');

        await openChapterMenu(user);
        await user.click(await screen.findByText(/8\.11 dpia\.sections\.escalationChain\.title/));

        expect(editorValue()).toBe('<p>escalation</p>');
        expect(screen.queryByText('dpia.editor.guard.description')).not.toBeInTheDocument();
    });
});
