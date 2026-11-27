import { beforeAll, describe, expect, it, vi } from 'vite-plus/test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EDITOR_FULLSCREEN_Z_INDEX, M3RichTextEditor } from './M3RichTextEditor';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, fallback?: string | Record<string, unknown>) =>
            typeof fallback === 'string' ? fallback : key,
        i18n: { language: 'de' },
    }),
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
    Element.prototype.scrollIntoView = vi.fn();
});

const agreement = '<h2 id="s1">§ 1 Gegenstand</h2><p>Die Vertragsparteien vereinbaren …</p>';

/**
 * #594.9 — "fullscreen makes the agreement text disappear".
 *
 * Root cause: antd paints every Modal at z-index 1000, but application-level
 * overlays that must outrank every popup sit above it — the global DPA blocker
 * owns 1300. Opening the reader's fullscreen dialog from inside such an
 * overlay therefore rendered the dialog BEHIND an opaque surface: the text was
 * gone and even the close button was unclickable. It is not specific to the
 * read-only path; any host stacked above antd's modal layer breaks the shared
 * editor's fullscreen, which is why the level is declared by the component.
 */
describe('M3RichTextEditor — fullscreen stacking', () => {
    it.each([
        ['reader', { readOnly: true }],
        ['editor', {}],
    ])('raises the %s fullscreen dialog above every application overlay', async (_label, props) => {
        render(<M3RichTextEditor title="AVV" value={agreement} {...props} />);

        fireEvent.click(await screen.findByRole('button', { name: 'legal.m3Editor.maximize' }));

        const wrap = await waitFor(() => {
            const node = document.querySelector<HTMLElement>('.ant-modal-wrap');
            expect(node).not.toBeNull();
            return node as HTMLElement;
        });

        expect(Number(wrap.style.zIndex)).toBe(EDITOR_FULLSCREEN_Z_INDEX);
        // The blocker overlay (DpaBlocker/styles.module.scss) sits at 1300.
        expect(EDITOR_FULLSCREEN_Z_INDEX).toBeGreaterThan(1300);
    });

    it('keeps the agreement text mounted after entering fullscreen', async () => {
        render(<M3RichTextEditor title="AVV" value={agreement} readOnly />);

        fireEvent.click(await screen.findByRole('button', { name: 'legal.m3Editor.maximize' }));

        await waitFor(() => expect(document.querySelector('.ant-modal-wrap')).not.toBeNull());
        await waitFor(() =>
            expect(document.querySelector('.ant-modal .ProseMirror')?.textContent).toContain('§ 1 Gegenstand'),
        );
    });
});

/**
 * #1605 — the legal document cards pass `fullscreenLabel`, which replaces the
 * icon-only maximize control with a named action and gives the dialog its own
 * close action. Both exits must hand focus back to the named trigger.
 */
describe('M3RichTextEditor — named fullscreen action', () => {
    const openNamedFullscreen = async () => {
        fireEvent.click(await screen.findByRole('button', { name: 'Vollbild' }));
        await waitFor(() => expect(screen.queryByRole('button', { name: 'Vollbild' })).toBeNull());
        await waitFor(() => expect(document.querySelector('.ant-modal-wrap')).not.toBeNull());
    };

    it('closes through either close action and returns focus to the named trigger', async () => {
        render(<M3RichTextEditor title="AVV" value={agreement} readOnly fullscreenLabel="Vollbild" />);
        expect(screen.queryByRole('button', { name: 'legal.m3Editor.maximize' })).toBeNull();

        await openNamedFullscreen();
        // The reader toolbar and the dialog header each offer a close action.
        const closeActions = screen.getAllByRole('button', { name: 'legal.m3Editor.closeDialog' });
        expect(closeActions).toHaveLength(2);

        for (let index = 0; index < closeActions.length; index += 1) {
            if (index > 0) {
                // Each round must finish before the next one reopens the dialog.
                // eslint-disable-next-line no-await-in-loop
                await openNamedFullscreen();
            }
            fireEvent.click(screen.getAllByRole('button', { name: 'legal.m3Editor.closeDialog' })[index]);
            // eslint-disable-next-line no-await-in-loop
            const trigger = await screen.findByRole('button', { name: 'Vollbild' });
            // eslint-disable-next-line no-await-in-loop
            await waitFor(() => expect(trigger).toHaveFocus());
        }
    });

    it('closes on Escape and returns focus to the named trigger', async () => {
        render(<M3RichTextEditor title="AVV" value={agreement} readOnly fullscreenLabel="Vollbild" />);

        await openNamedFullscreen();
        const wrap = document.querySelector<HTMLElement>('.ant-modal-wrap')!;
        fireEvent.keyDown(wrap, { key: 'Escape', code: 'Escape', keyCode: 27 });

        const trigger = await screen.findByRole('button', { name: 'Vollbild' });
        await waitFor(() => expect(trigger).toHaveFocus());
    });
});
