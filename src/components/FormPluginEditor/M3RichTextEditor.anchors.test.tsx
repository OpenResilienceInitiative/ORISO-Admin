import { beforeAll, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { M3RichTextEditor } from './M3RichTextEditor';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

const scrollIntoViewMock = vi.fn();

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
    Element.prototype.scrollIntoView = scrollIntoViewMock;
});

const content =
    '<h2 id="intro">Intro</h2><p>Hello <a href="#details">jump to details</a></p>' +
    '<h2 id="details">Details</h2><p>World</p>';

const chipSelector = '[data-anchor-chip]';

describe('M3RichTextEditor — anchor navigation (edit mode, default ON)', () => {
    it('renders a horizontal chip row with one removable chip per anchored heading', async () => {
        const { container } = render(<M3RichTextEditor value={content} />);
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(2));
        expect(screen.getByRole('navigation', { name: 'Section anchors' })).toBeInTheDocument();
        expect(container.querySelectorAll('.RichEditor-anchorNav .RichEditor-anchorChipRemove')).toHaveLength(2);
    });

    it('scrolls the heading into view when a chip is clicked', async () => {
        scrollIntoViewMock.mockClear();
        const { container } = render(<M3RichTextEditor value={content} />);
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(2));
        fireEvent.click(container.querySelector('[data-anchor-chip="details"] .RichEditor-anchorChipLabel')!);
        expect(scrollIntoViewMock).toHaveBeenCalled();
    });

    it('removes an anchor via the chip "x" and strips the id from the emitted HTML', async () => {
        const onChange = vi.fn();
        const { container } = render(<M3RichTextEditor value={content} onChange={onChange} />);
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(2));

        fireEvent.click(container.querySelector('[data-anchor-chip="intro"] .RichEditor-anchorChipRemove')!);

        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(1));
        const lastHtml = onChange.mock.calls[onChange.mock.calls.length - 1][0] as string;
        expect(lastHtml).not.toContain('id="intro"');
        expect(lastHtml).toContain('data-anchor-removed="true"');
        expect(lastHtml).toContain('id="details"');
    });

    it('stamps readable slug ids onto legacy content and emits them via onChange (data contract)', async () => {
        const onChange = vi.fn();
        const { container } = render(
            <M3RichTextEditor value="<h2>Geltungsbereich</h2><p>Text</p>" onChange={onChange} />,
        );
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(1));
        await waitFor(() => expect(onChange).toHaveBeenCalled());
        const lastHtml = onChange.mock.calls[onChange.mock.calls.length - 1][0] as string;
        expect(lastHtml).toContain('id="geltungsbereich"');
    });

    it('keeps duplicate heading texts unique with a numeric suffix', async () => {
        const onChange = vi.fn();
        const { container } = render(
            <M3RichTextEditor value="<h2>Kapitel</h2><p>a</p><h2>Kapitel</h2><p>b</p>" onChange={onChange} />,
        );
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(2));
        const ids = [...container.querySelectorAll(chipSelector)].map((el) => el.getAttribute('data-anchor-chip'));
        expect(ids).toEqual(['kapitel', 'kapitel-2']);
    });

    it('renders no chip row for content without headings (empty state)', async () => {
        const { container } = render(<M3RichTextEditor value="<p>Nur Fließtext.</p>" />);
        await waitFor(() => expect(container.querySelector('[data-testid="m3-editor"] p')).toBeTruthy());
        expect(container.querySelector(chipSelector)).toBeNull();
    });

    it('renders no chip row when anchors are disabled via prop', async () => {
        const { container } = render(<M3RichTextEditor value={content} enableAnchors={false} />);
        await waitFor(() => expect(container.querySelector('[data-testid="m3-editor"] h2')).toBeTruthy());
        expect(container.querySelector(chipSelector)).toBeNull();
    });

    it('renders no internal chip row when an editorSlot owns the content', async () => {
        const { container } = render(<M3RichTextEditor value={content} editorSlot={<div>slot editor</div>} />);
        await screen.findByText('slot editor');
        expect(container.querySelector(chipSelector)).toBeNull();
    });
});

describe('M3RichTextEditor — anchor navigation (read-only)', () => {
    it('shows chips without "x" and marks the clicked chip with a checkmark', async () => {
        const { container } = render(<M3RichTextEditor value={content} readOnly />);
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(2));
        expect(container.querySelectorAll('.RichEditor-anchorChipRemove')).toHaveLength(0);

        fireEvent.click(container.querySelector('[data-anchor-chip="details"] .RichEditor-anchorChipLabel')!);

        await waitFor(() =>
            expect(container.querySelector('[data-anchor-chip="details"].RichEditor-anchorChip--active')).toBeTruthy(),
        );
    });

    it('adds display-only anchors to legacy headings without emitting a content change', async () => {
        const onChange = vi.fn();
        const { container } = render(
            <M3RichTextEditor value="<h2>Ohne Anker</h2><p>Text</p>" readOnly onChange={onChange} />,
        );

        await waitFor(() => expect(container.querySelector('[data-anchor-chip="ohne-anker"]')).toBeTruthy());
        expect(container.querySelector('#ohne-anker')).toBeTruthy();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('writes the picked chapter into the URL hash (owner report 2026-08-18, F4/H4)', async () => {
        // „die anchor tags werden nicht gesetzt": picking a chapter must be
        // visible in the URL — it is the only feedback left when a short
        // document has no scroll distance, and it makes the chapter shareable.
        window.history.replaceState(null, '', '/read');
        const { container } = render(<M3RichTextEditor value={content} readOnly />);
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(2));

        fireEvent.click(container.querySelector('[data-anchor-chip="details"] .RichEditor-anchorChipLabel')!);

        expect(window.location.hash).toBe('#details');
        window.history.replaceState(null, '', '/');
    });

    it('never rewrites the URL while the author is editing', async () => {
        window.history.replaceState(null, '', '/edit');
        const { container } = render(<M3RichTextEditor value={content} />);
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(2));

        fireEvent.click(container.querySelector('[data-anchor-chip="details"] .RichEditor-anchorChipLabel')!);

        expect(window.location.hash).toBe('');
        window.history.replaceState(null, '', '/');
    });

    it('arriving with a #hash jumps to that chapter and marks its chip (shared link)', async () => {
        // The other half of the shareable URL: what the chip click writes must
        // work when pasted into a fresh tab.
        scrollIntoViewMock.mockClear();
        window.history.replaceState(null, '', '/read#details');
        const { container } = render(<M3RichTextEditor value={content} readOnly />);

        await waitFor(() => expect(scrollIntoViewMock).toHaveBeenCalled());
        await waitFor(() =>
            expect(container.querySelector('[data-anchor-chip="details"].RichEditor-anchorChip--active')).toBeTruthy(),
        );
        window.history.replaceState(null, '', '/');
    });

    it('ignores a hash that matches no chapter (stale or foreign link): no throw, no jump', async () => {
        scrollIntoViewMock.mockClear();
        window.history.replaceState(null, '', '/read#does-not-exist');
        const { container } = render(<M3RichTextEditor value={content} readOnly />);

        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(2));
        expect(scrollIntoViewMock).not.toHaveBeenCalled();
        expect(container.querySelector('.RichEditor-anchorChip--active')).toBeFalsy();
        window.history.replaceState(null, '', '/');
    });

    it('intercepts in-text #anchor links: scrolls instead of navigating', async () => {
        scrollIntoViewMock.mockClear();
        const { container } = render(<M3RichTextEditor value={content} readOnly />);
        await waitFor(() =>
            expect(container.querySelector('[data-testid="m3-editor"] a[href="#details"]')).toBeTruthy(),
        );

        fireEvent.click(container.querySelector('[data-testid="m3-editor"] a[href="#details"]')!);

        expect(scrollIntoViewMock).toHaveBeenCalled();
    });
});

describe('M3RichTextEditor — anchor HTML round-trip (contract)', () => {
    it('re-rendering emitted HTML yields the same anchors (ids survive the value/getHTML round-trip)', async () => {
        const onChange = vi.fn();
        const first = render(<M3RichTextEditor value="<h2>Geltungsbereich</h2><p>Text</p>" onChange={onChange} />);
        await waitFor(() => expect(onChange).toHaveBeenCalled());
        const emitted = onChange.mock.calls[onChange.mock.calls.length - 1][0] as string;
        first.unmount();

        const { container } = render(<M3RichTextEditor value={emitted} readOnly />);
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(1));
        expect(container.querySelector('[data-anchor-chip="geltungsbereich"]')).toBeTruthy();
    });

    it('a removed anchor stays removed after the round-trip (no re-assignment)', async () => {
        const removedHtml =
            '<h2 data-anchor-removed="true">Intro</h2><p>Hello</p><h2 id="details">Details</h2><p>World</p>';
        const { container } = render(<M3RichTextEditor value={removedHtml} />);
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(1));
        expect(container.querySelector('[data-anchor-chip="details"]')).toBeTruthy();
        expect(container.querySelector('[data-anchor-chip="intro"]')).toBeNull();
    });
});

describe('M3RichTextEditor — scroll spy tracks the real scroll viewport, not the editor content (owner report 2026-08-18, F4/H4)', () => {
    /**
     * jsdom performs no real layout, so the geometry this bug lives in has
     * to be modeled explicitly. Live measurement on pre-dev (#830 follow-up)
     * showed `editor.view.dom` and every heading inside it move TOGETHER as
     * some ancestor is scrolled — the fluid public reader's host sheet, or
     * (proven separately, see PR) even the fixed-height card's own
     * `.editorContentScroll` — while that ancestor's own on-screen position
     * never changes. Only the designated `scroller` gets a fixed rect here;
     * every placed element gets `docTop - scrollTop`, exactly like a real
     * browser scrolling one ancestor past its still content.
     */
    const rect = (top: number) =>
        ({
            top,
            bottom: top,
            left: 0,
            right: 0,
            width: 0,
            height: 0,
            x: 0,
            y: top,
            toJSON: () => undefined,
        } as DOMRect);

    it('activates the heading nearest the scroller top — not nearest editor.view.dom, which moves with its own headings', async () => {
        const scroller = document.createElement('div');
        scroller.style.overflowY = 'auto';
        document.body.appendChild(scroller);
        // jsdom never reports real scroll/client heights — force real overflow
        // so `findScrollViewport` recognises this as the actual scroller.
        Object.defineProperty(scroller, 'scrollHeight', { value: 2000, configurable: true });
        Object.defineProperty(scroller, 'clientHeight', { value: 500, configurable: true });

        let scrollTop = 0;
        const offsets = new Map<Element, number>();
        const rectSpy = vi
            .spyOn(Element.prototype, 'getBoundingClientRect')
            .mockImplementation(function mockedRect(this: Element) {
                if (this === scroller) return rect(100);
                if (offsets.has(this)) return rect(100 + (offsets.get(this) as number) - scrollTop);
                return rect(100);
            });

        try {
            const { container } = render(<M3RichTextEditor value={content} readOnly fluid />);
            scroller.appendChild(container);
            await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(2));

            const pm = container.querySelector('.ProseMirror') as HTMLElement;
            const intro = container.querySelector('#intro') as HTMLElement;
            const details = container.querySelector('#details') as HTMLElement;
            offsets.set(pm, 0);
            offsets.set(intro, 0);
            offsets.set(details, 600);

            // Scroll far enough that "details" (600px into the document) has
            // reached the scroller's top, well past the 32px threshold.
            scrollTop = 590;
            fireEvent.scroll(scroller);

            await waitFor(() =>
                expect(
                    container.querySelector('[data-anchor-chip="details"].RichEditor-anchorChip--active'),
                ).toBeTruthy(),
            );
            expect(container.querySelector('[data-anchor-chip="intro"].RichEditor-anchorChip--active')).toBeFalsy();
        } finally {
            rectSpy.mockRestore();
            scroller.remove();
        }
    });
});

describe('M3RichTextEditor — a chapter jump moves only the text viewport (owner demo 2026-08-18, positions 2-4)', () => {
    /**
     * Owner demo 2026-08-18: clicking "Anlage 3" re-scrolled the PAGE, the
     * chip bar moved out from under the cursor, and a second click was needed
     * ("Ich muss zweimal drüber, dass ich es überhaupt anwählen kann").
     * `scrollIntoView` is the mechanism of that bug: it drags EVERY scrollable
     * ancestor — the reader's own viewport AND the host sheet/page — so the
     * bar can never stand still during a jump. When the reader has a scroll
     * viewport of its own, a chapter jump must move that viewport and nothing
     * else. jsdom performs no layout, so the geometry is modeled the same way
     * as in the scroll-spy suite above.
     */
    const rect = (top: number) =>
        ({
            top,
            bottom: top,
            left: 0,
            right: 0,
            width: 0,
            height: 0,
            x: 0,
            y: top,
            toJSON: () => undefined,
        } as DOMRect);

    /**
     * Installs the fluid READER geometry at PROTOTYPE level, keyed on the
     * `role="region"` the read-only text viewport carries — the initial-hash
     * jump fires during the very first effect flush, before a test could ever
     * reach the rendered element, so instance-level mocks would come too late.
     * jsdom has no CSS layout, hence: the region reports real overflow
     * (scrollHeight 2000 > clientHeight 500), computed `overflow-y: auto`,
     * a fixed on-screen top of 100, and the `details` heading sits at 700 —
     * i.e. 600px into the document at scrollTop 0.
     */
    const installReaderViewportGeometry = () => {
        const isViewport = (el: unknown): el is HTMLElement =>
            el instanceof HTMLElement && el.getAttribute('role') === 'region';
        const scrollHeightDesc = Object.getOwnPropertyDescriptor(
            Element.prototype,
            'scrollHeight',
        ) as PropertyDescriptor;
        const clientHeightDesc = Object.getOwnPropertyDescriptor(
            Element.prototype,
            'clientHeight',
        ) as PropertyDescriptor;
        Object.defineProperty(Element.prototype, 'scrollHeight', {
            configurable: true,
            get(this: Element) {
                return isViewport(this) ? 2000 : (scrollHeightDesc.get as () => number).call(this);
            },
        });
        Object.defineProperty(Element.prototype, 'clientHeight', {
            configurable: true,
            get(this: Element) {
                return isViewport(this) ? 500 : (clientHeightDesc.get as () => number).call(this);
            },
        });
        const realGetComputedStyle = window.getComputedStyle.bind(window);
        const styleSpy = vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) => {
            const style = realGetComputedStyle(el, pseudo ?? undefined);
            if (!isViewport(el)) return style;
            return new Proxy(style, {
                get: (target, prop) => (prop === 'overflowY' ? 'auto' : Reflect.get(target, prop)),
            });
        });
        const rectSpy = vi
            .spyOn(Element.prototype, 'getBoundingClientRect')
            .mockImplementation(function mockedRect(this: Element) {
                if (isViewport(this)) return rect(100);
                if (this instanceof HTMLElement && this.id === 'details') return rect(700);
                return rect(100);
            });
        // jsdom's Element has no scrollTo — define it so the implementation's
        // feature check finds it, and so the call target is observable.
        const scrollTo = vi.fn();
        Object.defineProperty(Element.prototype, 'scrollTo', { configurable: true, value: scrollTo, writable: true });
        return {
            scrollTo,
            restore: () => {
                Object.defineProperty(Element.prototype, 'scrollHeight', scrollHeightDesc);
                Object.defineProperty(Element.prototype, 'clientHeight', clientHeightDesc);
                styleSpy.mockRestore();
                rectSpy.mockRestore();
                delete (Element.prototype as unknown as Record<string, unknown>).scrollTo;
            },
        };
    };

    it('scrolls the internal viewport by the heading offset — never scrollIntoView, which would drag the page along', async () => {
        scrollIntoViewMock.mockClear();
        // A leftover #hash from an earlier read-only test would trigger the
        // arrival jump on render and poison the "no scrollIntoView" assertion.
        window.history.replaceState(null, '', '/read');
        const geometry = installReaderViewportGeometry();
        try {
            const { container } = render(<M3RichTextEditor title="AVV" value={content} readOnly fluid />);
            await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(2));
            const viewport = screen.getByRole('region', { name: 'AVV' });

            fireEvent.click(container.querySelector('[data-anchor-chip="details"] .RichEditor-anchorChipLabel')!);

            // details sits 600px below the viewport top (700 - 100) at scrollTop 0.
            expect(geometry.scrollTo).toHaveBeenCalledWith({ top: 600 });
            expect(geometry.scrollTo.mock.contexts[0]).toBe(viewport);
            expect(scrollIntoViewMock).not.toHaveBeenCalled();
        } finally {
            geometry.restore();
            window.history.replaceState(null, '', '/');
        }
    });

    it('arriving with a #hash scrolls the viewport AND reveals the reader itself in the page', async () => {
        // A shared link must land on the chapter even when the reader sits
        // below the fold of the HOST page — the internal jump alone would
        // leave the user staring at the form fields above it. Revealing uses
        // block: "nearest", which never moves an already fully visible reader,
        // so a chip CLICK (viewport on screen by definition) stays a pure
        // internal scroll.
        scrollIntoViewMock.mockClear();
        window.history.replaceState(null, '', '/read#details');
        const geometry = installReaderViewportGeometry();
        try {
            const { container } = render(<M3RichTextEditor title="AVV" value={content} readOnly fluid />);

            await waitFor(() => expect(geometry.scrollTo).toHaveBeenCalledWith({ top: 600 }));
            expect(scrollIntoViewMock).toHaveBeenCalledWith({ block: 'nearest' });
            await waitFor(() =>
                expect(
                    container.querySelector('[data-anchor-chip="details"].RichEditor-anchorChip--active'),
                ).toBeTruthy(),
            );
        } finally {
            geometry.restore();
            window.history.replaceState(null, '', '/');
        }
    });

    it('keeps the picked chapter selected when the box cannot scroll it to the very top (short document)', async () => {
        // Measured live (Storybook, short pre-dev-shaped AVV, 1440x900): the
        // box parks at its maximum scroll before a late chapter reaches the
        // top edge, the programmatic scroll event fires, and the scroll spy —
        // which derives the active chapter from the reading POSITION —
        // overwrote the chapter the user had just PICKED. The click appeared
        // to not take ("ich kann es gar nicht anwählen"). A jump must park
        // the spy until the user actually scrolls the box again.
        scrollIntoViewMock.mockClear();
        window.history.replaceState(null, '', '/read');
        const { container } = render(<M3RichTextEditor title="AVV" value={content} readOnly fluid />);
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(2));

        // Post-render, instance-level geometry (no #hash arrival in this
        // test): the region is the scroll viewport, `details` sits 600px into
        // the document, and the box is ALREADY at its maximum — scrollTop can
        // never move past 0, exactly like the clamped live measurement.
        const viewport = screen.getByRole('region', { name: 'AVV' });
        viewport.style.overflowY = 'auto';
        Object.defineProperty(viewport, 'scrollHeight', { value: 2000, configurable: true });
        Object.defineProperty(viewport, 'clientHeight', { value: 500, configurable: true });
        let scrollTop = 0;
        Object.defineProperty(viewport, 'scrollTop', {
            configurable: true,
            get: () => scrollTop,
            set: () => {}, // clamped: the box has no scroll distance left
        });
        (viewport as HTMLElement & { scrollTo: (opts: ScrollToOptions) => void }).scrollTo = () => {};
        const rectAt = (top: number) => ({ top, bottom: top, left: 0, right: 0, width: 0, height: 0 } as DOMRect);
        const rectSpy = vi
            .spyOn(Element.prototype, 'getBoundingClientRect')
            .mockImplementation(function mockedRect(this: Element) {
                if (this === viewport) return rectAt(100);
                if (this instanceof HTMLElement && this.id === 'details') return rectAt(100 + 600 - scrollTop);
                return rectAt(100);
            });

        try {
            fireEvent.click(container.querySelector('[data-anchor-chip="details"] .RichEditor-anchorChipLabel')!);
            expect(container.querySelector('[data-anchor-chip="details"].RichEditor-anchorChip--active')).toBeTruthy();

            // The programmatic scroll event arrives with the box unmoved —
            // the spy must NOT hand the selection back to the top chapter.
            // The spy defers its measurement to a requestAnimationFrame, so
            // the frame must actually have run before the assertion means
            // anything (a waitFor would resolve on the pre-spy state).
            fireEvent.scroll(viewport);
            await act(
                () =>
                    new Promise<void>((resolve) => {
                        window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
                    }),
            );
            expect(container.querySelector('[data-anchor-chip="details"].RichEditor-anchorChip--active')).toBeTruthy();
            expect(container.querySelector('[data-anchor-chip="intro"].RichEditor-anchorChip--active')).toBeFalsy();

            // The user then scrolls the box themselves: the spy resumes and
            // tracks the reading position again (intro is back at the top).
            scrollTop = 300;
            fireEvent.scroll(viewport);
            await waitFor(() =>
                expect(
                    container.querySelector('[data-anchor-chip="intro"].RichEditor-anchorChip--active'),
                ).toBeTruthy(),
            );
        } finally {
            rectSpy.mockRestore();
            window.history.replaceState(null, '', '/');
        }
    });
});

describe('M3RichTextEditor — anchors inside the fullscreen dialog', () => {
    it('keeps the anchor row available when maximized into the modal', async () => {
        const { container } = render(<M3RichTextEditor value={content} />);
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(2));

        fireEvent.click(screen.getByRole('button', { name: /legal\.m3Editor\.maximize/ }));

        const dialog = await screen.findByRole('dialog');
        await waitFor(() => expect(dialog.querySelectorAll(chipSelector)).toHaveLength(2));
    });
});
