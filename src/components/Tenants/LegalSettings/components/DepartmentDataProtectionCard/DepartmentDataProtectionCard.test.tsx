import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DepartmentDataProtectionCard } from './index';

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

// TipTap pulls heavy editor deps; stub the M3 shell to a plain node that mirrors its
// contract: echoes the value, renders the slots, lets the test emit an edit when an
// onChange handler is wired, and exposes the publish/draft actions.
vi.mock('../../../../FormPluginEditor/M3RichTextEditor', () => ({
    M3RichTextEditor: ({
        value,
        onChange,
        publishing,
        onPublish,
        onSaveDraft,
        languageSlot,
        helpSlot,
        aboveEditorSlot,
        belowSlot,
    }: {
        value?: string;
        onChange?: (html: string) => void;
        publishing?: boolean;
        onPublish?: (html: string) => void;
        onSaveDraft?: (html: string) => void;
        languageSlot?: React.ReactNode;
        helpSlot?: React.ReactNode;
        aboveEditorSlot?: React.ReactNode;
        belowSlot?: React.ReactNode;
    }) => (
        <div data-testid="editor" data-value={value}>
            {languageSlot}
            {helpSlot}
            {aboveEditorSlot}
            {onChange && (
                <button type="button" onClick={() => onChange('<p>edited</p>')}>
                    edit
                </button>
            )}
            {onPublish && (
                <button type="button" disabled={publishing} onClick={() => onPublish(value)}>
                    legal.m3Editor.publish
                </button>
            )}
            {onSaveDraft && (
                <button type="button" onClick={() => onSaveDraft(value)}>
                    legal.m3Editor.saveDraft
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
    // getComputedStyle(el, pseudoEl) which jsdom does not implement. Drop the
    // pseudo-element so the language menu can open in the test environment.
    const originalGetComputedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element) => originalGetComputedStyle(el));
});

const publishButtonName = 'legal.m3Editor.publish';
const draftButtonName = 'legal.m3Editor.saveDraft';

describe('DepartmentDataProtectionCard', () => {
    it('publishes the complete content map (publish=true)', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(<DepartmentDataProtectionCard initialContentByLanguage={{ de: '<p>x</p>' }} onSave={onSave} />);

        await user.click(screen.getByRole('button', { name: publishButtonName }));

        expect(onSave).toHaveBeenCalledWith({ de: '<p>x</p>' }, true);
    });

    it('stores a draft (publish=false)', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(<DepartmentDataProtectionCard initialContentByLanguage={{ de: '<p>x</p>' }} onSave={onSave} />);

        await user.click(screen.getByRole('button', { name: draftButtonName }));

        expect(onSave).toHaveBeenCalledWith({ de: '<p>x</p>' }, false);
    });

    it('keeps the other languages when saving after editing only one language', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <DepartmentDataProtectionCard
                initialContentByLanguage={{ de: '<p>DE</p>', en: '<p>EN</p>' }}
                languages={['de', 'en']}
                defaultLanguage="en"
                onSave={onSave}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: publishButtonName }));
        // Only the non-source language was edited — the source warning is confirmed away (#720).
        await user.click(await screen.findByRole('button', { name: 'legal.publishWarning.confirm' }));

        expect(onSave).toHaveBeenCalledWith({ de: '<p>DE</p>', en: '<p>edited</p>' }, true);
    });

    it('passes unknown keys through untouched on save', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <DepartmentDataProtectionCard
                initialContentByLanguage={{ de: '<p>DE</p>', de__meta: 'meta' }}
                languages={['de', 'en']}
                defaultLanguage="de"
                onSave={onSave}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: draftButtonName }));

        expect(onSave).toHaveBeenCalledWith({ de: '<p>edited</p>', de__meta: 'meta' }, false);
    });

    it('switches the edited language via the language select', async () => {
        const user = userEvent.setup();
        render(
            <DepartmentDataProtectionCard
                initialContentByLanguage={{ de: '<p>DE</p>', en: '<p>EN</p>' }}
                languages={['de', 'en']}
                defaultLanguage="de"
                onSave={() => undefined}
            />,
        );

        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>DE</p>');

        await user.click(screen.getByRole('button', { name: /^languages:/ }));
        await user.click(await screen.findByText('en'));

        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>EN</p>');
    });

    it('opens on the legal source language when no default is given (#718)', () => {
        render(
            <DepartmentDataProtectionCard
                // 'en' first — the editor must still open on the source language 'de'
                initialContentByLanguage={{ de: '<p>DE</p>', en: '<p>EN</p>' }}
                languages={['en', 'de']}
                onSave={() => undefined}
            />,
        );

        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>DE</p>');
    });

    it('falls back to the first offered language when the source language is not offered', () => {
        render(
            <DepartmentDataProtectionCard
                initialContentByLanguage={{ en: '<p>EN</p>', fr: '<p>FR</p>' }}
                languages={['en', 'fr']}
                onSave={() => undefined}
            />,
        );

        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>EN</p>');
    });

    it('lets an explicit defaultLanguage override the source-language default', () => {
        render(
            <DepartmentDataProtectionCard
                initialContentByLanguage={{ de: '<p>DE</p>', en: '<p>EN</p>' }}
                languages={['de', 'en']}
                defaultLanguage="en"
                onSave={() => undefined}
            />,
        );

        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>EN</p>');
    });

    it('re-runs the automatic selection when the offered languages arrive late', () => {
        const { rerender } = render(
            <DepartmentDataProtectionCard
                // Before the tenant settings load only the stored language is offered.
                initialContentByLanguage={{ en: '<p>EN</p>' }}
                languages={['en']}
                onSave={() => undefined}
            />,
        );
        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>EN</p>');

        rerender(
            <DepartmentDataProtectionCard
                initialContentByLanguage={{ de: '<p>DE</p>', en: '<p>EN</p>' }}
                languages={['de', 'en']}
                onSave={() => undefined}
            />,
        );

        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>DE</p>');
    });

    it('keeps a language the admin engaged with when the offered languages change', async () => {
        const user = userEvent.setup();
        const { rerender } = render(
            <DepartmentDataProtectionCard
                initialContentByLanguage={{ de: '<p>DE</p>', en: '<p>EN</p>' }}
                languages={['de', 'en']}
                onSave={() => undefined}
            />,
        );

        await user.click(screen.getByRole('button', { name: /^languages:/ }));
        await user.click(await screen.findByText('en'));
        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>EN</p>');

        rerender(
            <DepartmentDataProtectionCard
                initialContentByLanguage={{ de: '<p>DE</p>', en: '<p>EN</p>', fr: '<p>FR</p>' }}
                languages={['de', 'en', 'fr']}
                onSave={() => undefined}
            />,
        );

        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>EN</p>');
    });

    it('keeps a language the admin edited when the offered languages change', async () => {
        const user = userEvent.setup();
        const { rerender } = render(
            <DepartmentDataProtectionCard
                // Before the tenant settings load only the stored language is offered.
                initialContentByLanguage={{ en: '<p>EN</p>' }}
                languages={['en']}
                onSave={() => undefined}
            />,
        );

        // Editing counts as engagement just like picking a language in the menu.
        await user.click(screen.getByRole('button', { name: 'edit' }));
        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>edited</p>');

        rerender(
            <DepartmentDataProtectionCard
                initialContentByLanguage={{ de: '<p>DE</p>', en: '<p>EN</p>' }}
                languages={['de', 'en']}
                onSave={() => undefined}
            />,
        );

        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>edited</p>');
    });

    it('marks languages without content in the language menu (#718)', async () => {
        const user = userEvent.setup();
        render(
            <DepartmentDataProtectionCard
                initialContentByLanguage={{ de: '<p>DE</p>' }}
                languages={['de', 'en']}
                onSave={() => undefined}
            />,
        );

        await user.click(screen.getByRole('button', { name: /^languages:/ }));

        expect(await screen.findByText('legal.translation.label.empty:en')).toBeInTheDocument();
        // The source language carries content and keeps its "original" label.
        expect(screen.getByText('legal.translation.label.original:de')).toBeInTheDocument();
    });

    it('shows the published status tag', () => {
        render(<DepartmentDataProtectionCard publicationStatus="PUBLISHED" onSave={() => undefined} />);
        expect(screen.getByText('tenants.legal.departmentDataProtection.status.published')).toBeInTheDocument();
    });

    it('shows the draft status tag by default', () => {
        render(<DepartmentDataProtectionCard onSave={() => undefined} />);
        expect(screen.getByText('tenants.legal.departmentDataProtection.status.draft')).toBeInTheDocument();
    });

    it('renders the department name when provided', () => {
        render(<DepartmentDataProtectionCard departmentName="Suchtberatung" onSave={() => undefined} />);
        expect(screen.getByText('Suchtberatung')).toBeInTheDocument();
    });
});

describe('DepartmentDataProtectionCard — publish source warning (#720)', () => {
    const warnConfirmName = 'legal.publishWarning.confirm';
    const warnCancelName = 'legal.publishWarning.cancel';

    it('warns when publishing edits only in a non-source language; confirming publishes', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <DepartmentDataProtectionCard
                initialContentByLanguage={{ de: '<p>DE</p>', en: '<p>EN</p>' }}
                languages={['de', 'en']}
                onSave={onSave}
            />,
        );

        await user.click(screen.getByRole('button', { name: /^languages:/ }));
        await user.click(await screen.findByText('en'));
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: publishButtonName }));

        expect(onSave).not.toHaveBeenCalled();
        expect(screen.getByText('legal.publishWarning.title')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: warnConfirmName }));
        expect(onSave).toHaveBeenCalledWith({ de: '<p>DE</p>', en: '<p>edited</p>' }, true);
    });

    it('cancelling the warning publishes nothing and returns to the editor', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <DepartmentDataProtectionCard
                initialContentByLanguage={{ de: '<p>DE</p>', en: '<p>EN</p>' }}
                languages={['de', 'en']}
                onSave={onSave}
            />,
        );

        await user.click(screen.getByRole('button', { name: /^languages:/ }));
        await user.click(await screen.findByText('en'));
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: publishButtonName }));
        await user.click(await screen.findByRole('button', { name: warnCancelName }));

        expect(onSave).not.toHaveBeenCalled();
        expect(screen.queryByText('legal.publishWarning.title')).not.toBeInTheDocument();
    });

    it('does not warn when the source language itself was edited', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <DepartmentDataProtectionCard
                initialContentByLanguage={{ de: '<p>DE</p>', en: '<p>EN</p>' }}
                languages={['de', 'en']}
                onSave={onSave}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: publishButtonName }));

        expect(screen.queryByText('legal.publishWarning.title')).not.toBeInTheDocument();
        expect(onSave).toHaveBeenCalledWith({ de: '<p>edited</p>', en: '<p>EN</p>' }, true);
    });

    it('does not warn for machine-translated languages (they come from the source)', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        const onTranslate = vi.fn().mockResolvedValue({
            translations: { en: { content: '<p>EN-MT</p>' } },
            provider: 'openrouter',
            model: 'test-model',
        });
        render(
            <DepartmentDataProtectionCard
                initialContentByLanguage={{ de: '<p>DE</p>' }}
                languages={['de', 'en']}
                onSave={onSave}
                onTranslate={onTranslate}
            />,
        );

        // Translate EN from the source via the per-field button, then publish.
        await user.click(screen.getByRole('button', { name: /^languages:/ }));
        await user.click(await screen.findByText('legal.translation.label.empty:en'));
        await user.click(screen.getByRole('button', { name: 'legal.translation.field.button' }));
        await waitFor(() => expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>EN-MT</p>'));

        await user.click(screen.getByRole('button', { name: publishButtonName }));

        // Straight to the translate-on-publish modal — no source warning in between.
        expect(screen.queryByText('legal.publishWarning.title')).not.toBeInTheDocument();
        expect(await screen.findByRole('button', { name: 'legal.translation.modal.confirm' })).toBeInTheDocument();
    });
});

describe('DepartmentDataProtectionCard — translate on publish', () => {
    const confirmButtonName = 'legal.translation.modal.confirm';

    const onTranslateMock = () =>
        vi.fn().mockResolvedValue({
            translations: { en: { content: '<p>EN-MT</p>' } },
            provider: 'openrouter',
            model: 'test-model',
        });

    it('opens the translate modal on publish and saves the merged map incl. __meta', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        const onTranslate = onTranslateMock();
        render(
            <DepartmentDataProtectionCard
                initialContentByLanguage={{ de: '<p>DE</p>' }}
                languages={['de', 'en']}
                defaultLanguage="de"
                onSave={onSave}
                onTranslate={onTranslate}
            />,
        );

        await user.click(screen.getByRole('button', { name: publishButtonName }));
        await user.click(await screen.findByRole('button', { name: confirmButtonName }));

        await waitFor(() => expect(onSave).toHaveBeenCalled());
        expect(onTranslate).toHaveBeenCalledWith({
            sourceLang: 'de',
            targetLangs: ['en'],
            texts: { content: '<p>DE</p>' },
        });
        const [savedMap, published] = onSave.mock.calls[0];
        expect(published).toBe(true);
        expect(savedMap.en).toBe('<p>EN-MT</p>');
        expect(JSON.parse(savedMap.en__meta)).toMatchObject({ mt: true, src: 'de' });
    });

    it('never opens the modal for a draft save (no translation)', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        const onTranslate = onTranslateMock();
        render(
            <DepartmentDataProtectionCard
                initialContentByLanguage={{ de: '<p>DE</p>' }}
                languages={['de', 'en']}
                defaultLanguage="de"
                onSave={onSave}
                onTranslate={onTranslate}
            />,
        );

        await user.click(screen.getByRole('button', { name: draftButtonName }));

        expect(onTranslate).not.toHaveBeenCalled();
        expect(onSave).toHaveBeenCalledWith({ de: '<p>DE</p>' }, false);
        expect(screen.queryByRole('button', { name: confirmButtonName })).not.toBeInTheDocument();
    });
});
