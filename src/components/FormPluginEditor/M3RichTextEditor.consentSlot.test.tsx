import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { M3RichTextEditor } from './M3RichTextEditor';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, fallbackOrOptions?: unknown) => {
            if (typeof fallbackOrOptions === 'string') return fallbackOrOptions;
            return key;
        },
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

/**
 * The lower function bar carries up to four split buttons (Figma 1261-48667 plus
 * the consent template chooser of ADR-021 decision 4). `consentSlot` is the third
 * of those to be filled from outside, and — like `topicSlot` — must be able to
 * hold the bar open on its own.
 */
describe('M3RichTextEditor consentSlot', () => {
    it('renders the consent slot in the lower function bar', async () => {
        render(<M3RichTextEditor title="Datenschutz" consentSlot={<button type="button">Vorlage 2</button>} />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Vorlage 2' })).toBeInTheDocument();
        });
    });

    it('orders the bar language → consent → topic → version', async () => {
        render(
            <M3RichTextEditor
                title="Datenschutz"
                languageSlot={<span data-testid="slot-language">DE</span>}
                consentSlot={<span data-testid="slot-consent">Vorlage 2</span>}
                topicSlot={<span data-testid="slot-topic">Sucht</span>}
                versions={[{ id: 'v1', label: '1. Jul 2026', content: '<p>alt</p>' }]}
            />,
        );

        const bar = await screen.findByTestId('m3-editor-function-bar');
        const language = screen.getByTestId('slot-language');
        const consent = screen.getByTestId('slot-consent');
        const topic = screen.getByTestId('slot-topic');
        const version = screen.getByTitle('legal.m3Editor.versionHistory');

        // All four live in the same bar …
        expect(bar).toContainElement(language);
        expect(bar).toContainElement(consent);
        expect(bar).toContainElement(topic);
        expect(bar).toContainElement(version);

        // … in the order the footer design specifies.
        const order = Array.from(bar.children);
        expect(order.indexOf(language)).toBeLessThan(order.indexOf(consent));
        expect(order.indexOf(consent)).toBeLessThan(order.indexOf(topic));
        expect(order.indexOf(topic)).toBeLessThan(
            order.findIndex((child) => child === version || child.contains(version)),
        );
    });

    it('keeps the bar when the consent slot is the only control in it', async () => {
        // read-only + no versions removes the version control, a single language
        // removes the language control, and no topicSlot is passed. Without the
        // consent slot in the render guard the bar would disappear entirely.
        render(
            <M3RichTextEditor
                title="Datenschutz"
                readOnly
                languages={[{ value: 'de', label: 'Deutsch' }]}
                consentSlot={<span data-testid="slot-consent">Vorlage 2</span>}
            />,
        );

        const bar = await screen.findByTestId('m3-editor-function-bar');
        expect(bar).toContainElement(screen.getByTestId('slot-consent'));
    });
});
