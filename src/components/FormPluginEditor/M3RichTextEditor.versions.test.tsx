import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { M3RichTextEditor, parseVersionDate } from './M3RichTextEditor';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (_key: string, fallbackOrOptions?: unknown) => {
            if (typeof fallbackOrOptions === 'string') return fallbackOrOptions;
            if (fallbackOrOptions && typeof fallbackOrOptions === 'object') {
                return `${_key}:${Object.values(fallbackOrOptions).join(':')}`;
            }
            return _key;
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

const versions = [
    { id: '2026-07-01T10:00', label: '1. Jul 2026 – 10:00', content: '<p>Fassung Juli</p>' },
    { id: '2026-05-02T09:00', label: '2. Mai 2026 – 09:00', content: '<p>Fassung Mai</p>' },
];

const openVersionMenu = async (user: ReturnType<typeof userEvent.setup>) => {
    // The version control lives in the sub-actions row; its stable purpose is on the title attr.
    const trigger = screen.getByTitle('legal.m3Editor.versionHistory');
    await user.click(trigger);
};

/**
 * ADR-021/ORISO-AgencyService#256 keys a legal-text version by a surrogate id and
 * carries the publication timestamp beside it. The editor must date its entries
 * from that timestamp — a numeric id fed to `new Date()` yields a year.
 */
describe('M3RichTextEditor — version dates from publishedAt (#812)', () => {
    const surrogate = [
        { id: '42', publishedAt: '2026-07-01T10:00', label: 'Juli', content: '<p>Fassung Juli</p>' },
        { id: '17', publishedAt: '2026-05-02T09:00', label: 'Mai', content: '<p>Fassung Mai</p>' },
    ];

    it('reports online-since from the oldest publication date, not from its id', async () => {
        const user = userEvent.setup();
        render(
            <M3RichTextEditor title="Datenschutz" value="<p>Entwurf</p>" versions={surrogate} enableAnchors={false} />,
        );

        await openVersionMenu(user);

        const oldest = parseVersionDate('2026-05-02T09:00')!;
        const formatted = `${oldest.toLocaleDateString('de', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
        })} | ${oldest.toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })} Uhr`;
        expect(await screen.findByText(`legal.m3Editor.versionOnlineSince:${formatted}`)).toBeInTheDocument();
    });

    it('dates the published range from publishedAt', async () => {
        const user = userEvent.setup();
        render(
            <M3RichTextEditor title="Datenschutz" value="<p>Entwurf</p>" versions={surrogate} enableAnchors={false} />,
        );

        await openVersionMenu(user);

        // Variant #1 is the older entry: published on 02.05., superseded on 01.07.
        expect(
            await screen.findByText(/legal\.m3Editor\.versionRangePublished:02\.05\.26.*01\.07\.26/),
        ).toBeInTheDocument();
    });
});

describe('M3RichTextEditor — version select (#268)', () => {
    it('parses date-only ids as the same local calendar date', () => {
        const parsed = parseVersionDate('2026-07-01');
        expect(parsed).not.toBeNull();
        expect([parsed?.getFullYear(), parsed?.getMonth(), parsed?.getDate()]).toEqual([2026, 6, 1]);
        expect(parseVersionDate('2026-02-31')).toBeNull();
        expect(parseVersionDate('not-a-date')).toBeNull();
    });
    it('lists the current draft plus every provided version in the version menu', async () => {
        const user = userEvent.setup();
        render(
            <M3RichTextEditor title="Datenschutz" value="<p>Entwurf</p>" versions={versions} enableAnchors={false} />,
        );

        await openVersionMenu(user);

        await waitFor(() => {
            expect(screen.getByText('legal.m3Editor.versionVariant:2')).toBeInTheDocument();
        });
        expect(screen.getByText('legal.m3Editor.versionVariant:1')).toBeInTheDocument();
        // A way back to the editable draft is always offered.
        expect(screen.getByText(/legal\.m3Editor\.versionCurrentDraft/i)).toBeInTheDocument();
    });

    it('reports online-since from the oldest publication', async () => {
        const user = userEvent.setup();
        render(
            <M3RichTextEditor title="Datenschutz" value="<p>Entwurf</p>" versions={versions} enableAnchors={false} />,
        );

        await openVersionMenu(user);

        const oldest = parseVersionDate(versions[versions.length - 1].id)!;
        const formatted = `${oldest.toLocaleDateString('de', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
        })} | ${oldest.toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })} Uhr`;
        expect(screen.getByText(`legal.m3Editor.versionOnlineSince:${formatted}`)).toBeInTheDocument();
    });

    it('shows a selected older version read-only with a restore + back banner', async () => {
        const user = userEvent.setup();
        const { container } = render(
            <M3RichTextEditor
                title="Datenschutz"
                value="<p>Entwurf</p>"
                versions={versions}
                onRestoreVersion={vi.fn()}
                enableAnchors={false}
            />,
        );

        await openVersionMenu(user);
        await user.click(await screen.findByText('legal.m3Editor.versionVariant:1'));

        // The editor now renders the version content, read-only (contenteditable=false).
        await waitFor(() => {
            expect(container.querySelector('.tiptap')?.getAttribute('contenteditable')).toBe('false');
        });
        expect(screen.getByText(/legal\.m3Editor\.viewingVersion/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /legal\.m3Editor\.restoreVersion/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /legal\.m3Editor\.backToDraft/i })).toBeInTheDocument();
    });

    it('restores an old version as a new draft (copy) via onRestoreVersion', async () => {
        const user = userEvent.setup();
        const onRestore = vi.fn();
        render(
            <M3RichTextEditor
                title="Datenschutz"
                value="<p>Entwurf</p>"
                versions={versions}
                onRestoreVersion={onRestore}
                enableAnchors={false}
            />,
        );

        await openVersionMenu(user);
        await user.click(await screen.findByText('legal.m3Editor.versionVariant:1'));
        await user.click(screen.getByRole('button', { name: /legal\.m3Editor\.restoreVersion/i }));

        expect(onRestore).toHaveBeenCalledWith('<p>Fassung Mai</p>');
        // After restoring, the banner is gone (back to editing the draft).
        await waitFor(() => {
            expect(screen.queryByText(/legal\.m3Editor\.viewingVersion/i)).not.toBeInTheDocument();
        });
    });

    it('returns to the editable draft when "back to draft" is clicked', async () => {
        const user = userEvent.setup();
        const { container } = render(
            <M3RichTextEditor title="Datenschutz" value="<p>Entwurf</p>" versions={versions} enableAnchors={false} />,
        );

        await openVersionMenu(user);
        await user.click(await screen.findByText('legal.m3Editor.versionVariant:2'));
        await waitFor(() => expect(container.querySelector('.tiptap')?.getAttribute('contenteditable')).toBe('false'));

        await user.click(screen.getByRole('button', { name: /legal\.m3Editor\.backToDraft/i }));

        await waitFor(() => expect(container.querySelector('.tiptap')?.getAttribute('contenteditable')).toBe('true'));
        expect(screen.queryByText(/legal\.m3Editor\.viewingVersion/i)).not.toBeInTheDocument();
    });

    it('does not show restore/back controls when no versions are provided', async () => {
        render(<M3RichTextEditor title="Impressum" value="<p>x</p>" enableAnchors={false} />);
        expect(screen.queryByText(/legal\.m3Editor\.viewingVersion/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /legal\.m3Editor\.restoreVersion/i })).not.toBeInTheDocument();
    });

    it('never offers restore in read-only mode even if versions are passed', async () => {
        const user = userEvent.setup();
        render(
            <M3RichTextEditor
                title="Datenschutz"
                value="<p>x</p>"
                versions={versions}
                readOnly
                enableAnchors={false}
            />,
        );
        await openVersionMenu(user);
        await user.click(await screen.findByText('legal.m3Editor.versionVariant:1'));
        // Viewing works, but there is no "restore as draft" in a read-only card.
        expect(screen.queryByRole('button', { name: /legal\.m3Editor\.restoreVersion/i })).not.toBeInTheDocument();
    });

    it('hides anchor removal while viewing a version so the draft cannot be mutated', async () => {
        const user = userEvent.setup();
        const anchoredVersions = [
            { id: 'v-mai', label: '2. Mai 2026 – 09:00', content: '<h2 id="alt">Alte Fassung</h2><p>Mai</p>' },
        ];
        const { container } = render(
            <M3RichTextEditor
                title="Datenschutz"
                value="<h2>Aktueller Entwurf</h2><p>Juli</p>"
                versions={anchoredVersions}
                onRestoreVersion={vi.fn()}
            />,
        );

        // Editable draft: the anchor chip row is removable (has a close "x").
        await waitFor(() =>
            expect(container.querySelectorAll('.RichEditor-anchorChipRemove').length).toBeGreaterThan(0),
        );

        await openVersionMenu(user);
        await user.click(await screen.findByText('legal.m3Editor.versionVariant:1'));

        // While viewing the version (read-only) the chips still render but lose
        // their remove "x", so there is no path to mutate/overwrite the draft.
        await waitFor(() => expect(container.querySelector('.tiptap')?.getAttribute('contenteditable')).toBe('false'));
        await waitFor(() => expect(container.querySelectorAll('[data-anchor-chip]').length).toBeGreaterThan(0));
        expect(container.querySelectorAll('.RichEditor-anchorChipRemove')).toHaveLength(0);
    });
});
