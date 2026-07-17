import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataProcessingAgreementCard } from './index';
import { TranslationApiError } from '../../../../../api/tenant/translation';
import { TranslateResponse } from '../../../../../types/translation';

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
// onChange handler is wired, exposes the publish action unless read-only, and mirrors
// the version select (one node per version; restore hands the version's content back).
vi.mock('../../../../FormPluginEditor/M3RichTextEditor', () => ({
    M3RichTextEditor: ({
        value,
        onChange,
        readOnly,
        publishing,
        onPublish,
        languageSlot,
        aboveEditorSlot,
        belowSlot,
        versions,
        onRestoreVersion,
    }: {
        value: string;
        onChange?: (html: string) => void;
        readOnly?: boolean;
        publishing?: boolean;
        onPublish?: (html: string) => void;
        languageSlot?: React.ReactNode;
        aboveEditorSlot?: React.ReactNode;
        belowSlot?: React.ReactNode;
        versions?: { id: string; label: string; content: string }[];
        onRestoreVersion?: (content: string) => void;
    }) => (
        <div data-testid="editor" data-value={value} data-readonly={readOnly ? 'true' : 'false'}>
            {languageSlot}
            {aboveEditorSlot}
            {!readOnly && onChange && (
                <button type="button" onClick={() => onChange('<p>edited</p>')}>
                    edit
                </button>
            )}
            {!readOnly && onPublish && (
                <button type="button" disabled={publishing} onClick={() => onPublish(value)}>
                    legal.m3Editor.publish
                </button>
            )}
            {(versions ?? []).map((version) => (
                <div key={version.id} data-testid={`version-${version.id}`} data-content={version.content}>
                    {version.label}
                    {onRestoreVersion && (
                        <button type="button" onClick={() => onRestoreVersion(version.content)}>
                            restore {version.id}
                        </button>
                    )}
                </div>
            ))}
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

describe('DataProcessingAgreementCard', () => {
    it('keeps the other languages when publishing after editing only one language', async () => {
        const user = userEvent.setup();
        const onPublish = vi.fn();
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>', en: '<p>EN</p>' }}
                languages={['de', 'en']}
                defaultLanguage="en"
                versions={[]}
                onPublish={onPublish}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: publishButtonName }));

        expect(onPublish).toHaveBeenCalledWith({ de: '<p>DE</p>', en: '<p>edited</p>' });
    });

    it('passes unknown keys through untouched on publish', async () => {
        const user = userEvent.setup();
        const onPublish = vi.fn();
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>', de__meta: 'meta', fr: '<p>FR</p>' }}
                languages={['de', 'en']}
                defaultLanguage="de"
                versions={[]}
                onPublish={onPublish}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: publishButtonName }));

        expect(onPublish).toHaveBeenCalledWith({ de: '<p>edited</p>', de__meta: 'meta', fr: '<p>FR</p>' });
    });

    it('does not add a language the admin never filled', async () => {
        const user = userEvent.setup();
        const onPublish = vi.fn();
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>' }}
                languages={['de', 'en']}
                defaultLanguage="de"
                versions={[]}
                onPublish={onPublish}
            />,
        );

        await user.click(screen.getByRole('button', { name: publishButtonName }));

        expect(onPublish).toHaveBeenCalledWith({ de: '<p>DE</p>' });
    });

    it('switches the shown language via the language select', async () => {
        const user = userEvent.setup();
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>', en: '<p>EN</p>' }}
                languages={['de', 'en']}
                defaultLanguage="de"
                versions={[]}
                onPublish={() => undefined}
            />,
        );

        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>DE</p>');

        await user.click(screen.getByRole('button', { name: 'languages' }));
        await user.click(await screen.findByText('en'));

        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>EN</p>');
    });

    it('hides the language select when only one language is active', () => {
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>' }}
                languages={['de']}
                versions={[]}
                onPublish={() => undefined}
            />,
        );
        expect(screen.queryByRole('button', { name: 'languages' })).not.toBeInTheDocument();
    });

    it('labels the source language as original and MT languages as machine translated', async () => {
        const user = userEvent.setup();
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{
                    de: '<p>DE</p>',
                    en: '<p>EN</p>',
                    en__meta: '{"mt":true,"src":"de","at":"2026-07-01T10:00:00Z"}',
                }}
                languages={['de', 'en']}
                defaultLanguage="de"
                versions={[]}
                onPublish={() => undefined}
            />,
        );

        // Open the language menu via the split-button's dropdown trigger.
        await user.click(screen.getByRole('button', { name: 'languages' }));

        // Mocked t(): "key:interpolated-language". The menu lists each language with
        // its translation status (source = original, MT = machine translated).
        expect(await screen.findByText('legal.translation.label.original:de')).toBeInTheDocument();
        expect(screen.getByText('legal.translation.label.machineTranslated:en')).toBeInTheDocument();
    });

    it('renders read-only without a publish button or editable editor', () => {
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>' }}
                languages={['de']}
                versions={[]}
                onPublish={() => undefined}
                readOnly
            />,
        );

        expect(screen.queryByRole('button', { name: publishButtonName })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'edit' })).not.toBeInTheDocument();
        expect(screen.getByText('tenants.legal.dataProcessingAgreement.managedByTenant')).toBeInTheDocument();
        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>DE</p>');
    });
});

describe('DataProcessingAgreementCard — version select wiring (#268)', () => {
    const storedVersions = [
        { id: 'v2', label: '1. Jul 2026', content: '{"de":"<p>DE v2</p>","en":"<p>EN v2</p>"}' },
        { id: 'v1', label: '1. Mai 2026', content: '{"de":"<p>DE v1</p>"}' },
    ];

    it('feeds the versions to the editor select in the active language', () => {
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>', en: '<p>EN</p>' }}
                languages={['de', 'en']}
                defaultLanguage="en"
                versions={storedVersions}
                onPublish={() => undefined}
            />,
        );

        expect(screen.getByTestId('version-v2')).toHaveAttribute('data-content', '<p>EN v2</p>');
        // v1 was never translated: fall back to its first stored language, never an empty page.
        expect(screen.getByTestId('version-v1')).toHaveAttribute('data-content', '<p>DE v1</p>');
    });

    it('re-picks the version texts when the admin switches the language', async () => {
        const user = userEvent.setup();
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>', en: '<p>EN</p>' }}
                languages={['de', 'en']}
                defaultLanguage="de"
                versions={storedVersions}
                onPublish={() => undefined}
            />,
        );

        expect(screen.getByTestId('version-v2')).toHaveAttribute('data-content', '<p>DE v2</p>');

        await user.click(screen.getByRole('button', { name: 'languages' }));
        await user.click(await screen.findByText('en'));

        expect(screen.getByTestId('version-v2')).toHaveAttribute('data-content', '<p>EN v2</p>');
    });

    it('restore copies the version text into the current draft and publishes it (restore = copy)', async () => {
        const user = userEvent.setup();
        const onPublish = vi.fn();
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>', en: '<p>EN</p>' }}
                languages={['de', 'en']}
                defaultLanguage="en"
                versions={storedVersions}
                onPublish={onPublish}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'restore v2' }));
        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>EN v2</p>');

        await user.click(screen.getByRole('button', { name: publishButtonName }));
        // Only the active language's draft was replaced — the other languages stay untouched.
        expect(onPublish).toHaveBeenCalledWith({ de: '<p>DE</p>', en: '<p>EN v2</p>' });
    });

    it('offers no restore in read-only mode (agency page: look, do not edit)', () => {
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>' }}
                languages={['de']}
                versions={storedVersions}
                onPublish={() => undefined}
                readOnly
            />,
        );

        // The versions are still browsable, but nothing offers a restore.
        expect(screen.getByTestId('version-v2')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /restore/ })).not.toBeInTheDocument();
    });

    it('no longer renders the separate look-back viewer below the editor', () => {
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>' }}
                languages={['de']}
                versions={storedVersions}
                onPublish={() => undefined}
            />,
        );

        expect(screen.queryByText('tenants.legal.version.history')).not.toBeInTheDocument();
    });
});

const confirmButtonName = 'legal.translation.modal.confirm';
const skipButtonName = 'legal.translation.modal.skip';
const fieldButtonName = 'legal.translation.field.button';

const translateResponse = (byLanguage: Record<string, string>): TranslateResponse => ({
    translations: Object.fromEntries(Object.entries(byLanguage).map(([lang, html]) => [lang, { content: html }])),
    provider: 'openrouter',
    model: 'test-model',
});

describe('DataProcessingAgreementCard — translate on publish', () => {
    it('translates all selected languages with ONE call and publishes the merged map incl. __meta', async () => {
        const user = userEvent.setup();
        const onPublish = vi.fn();
        const onTranslate = vi.fn().mockResolvedValue(translateResponse({ en: '<p>EN-MT</p>', fr: '<p>FR-MT</p>' }));
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>' }}
                languages={['de', 'en', 'fr']}
                defaultLanguage="de"
                versions={[]}
                onPublish={onPublish}
                onTranslate={onTranslate}
            />,
        );

        await user.click(screen.getByRole('button', { name: publishButtonName }));
        await user.click(await screen.findByRole('button', { name: confirmButtonName }));

        await waitFor(() => expect(onPublish).toHaveBeenCalled());
        expect(onTranslate).toHaveBeenCalledTimes(1);
        expect(onTranslate).toHaveBeenCalledWith({
            sourceLang: 'de',
            targetLangs: ['en', 'fr'],
            texts: { content: '<p>DE</p>' },
        });

        const published = onPublish.mock.calls[0][0];
        expect(published.de).toBe('<p>DE</p>');
        expect(published.en).toBe('<p>EN-MT</p>');
        expect(published.fr).toBe('<p>FR-MT</p>');
        expect(JSON.parse(published.en__meta)).toMatchObject({ mt: true, src: 'de' });
        expect(JSON.parse(published.fr__meta)).toMatchObject({ mt: true, src: 'de' });
        expect(new Date(JSON.parse(published.en__meta).at).toISOString()).toBe(JSON.parse(published.en__meta).at);
    });

    it('leaves deselected languages untouched (no content, no meta)', async () => {
        const user = userEvent.setup();
        const onPublish = vi.fn();
        const onTranslate = vi.fn().mockResolvedValue(translateResponse({ en: '<p>EN-MT</p>' }));
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>' }}
                languages={['de', 'en', 'fr']}
                defaultLanguage="de"
                versions={[]}
                onPublish={onPublish}
                onTranslate={onTranslate}
            />,
        );

        await user.click(screen.getByRole('button', { name: publishButtonName }));
        await user.click(await screen.findByRole('checkbox', { name: 'fr' }));
        await user.click(screen.getByRole('button', { name: confirmButtonName }));

        await waitFor(() => expect(onPublish).toHaveBeenCalled());
        expect(onTranslate).toHaveBeenCalledWith(expect.objectContaining({ targetLangs: ['en'] }));

        const published = onPublish.mock.calls[0][0];
        expect(published).not.toHaveProperty('fr');
        expect(published).not.toHaveProperty('fr__meta');
        expect(published.en).toBe('<p>EN-MT</p>');
    });

    it('publishes WITHOUT translation via the skip button', async () => {
        const user = userEvent.setup();
        const onPublish = vi.fn();
        const onTranslate = vi.fn();
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>' }}
                languages={['de', 'en']}
                defaultLanguage="de"
                versions={[]}
                onPublish={onPublish}
                onTranslate={onTranslate}
            />,
        );

        await user.click(screen.getByRole('button', { name: publishButtonName }));
        await user.click(await screen.findByRole('button', { name: skipButtonName }));

        expect(onTranslate).not.toHaveBeenCalled();
        expect(onPublish).toHaveBeenCalledWith({ de: '<p>DE</p>' });
    });

    it('shows the mapped human error message in the modal and does not publish', async () => {
        const user = userEvent.setup();
        const onPublish = vi.fn();
        const onTranslate = vi.fn().mockRejectedValue(new TranslationApiError('TRANSLATION_KEY_INVALID'));
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>' }}
                languages={['de', 'en']}
                defaultLanguage="de"
                versions={[]}
                onPublish={onPublish}
                onTranslate={onTranslate}
            />,
        );

        await user.click(screen.getByRole('button', { name: publishButtonName }));
        await user.click(await screen.findByRole('button', { name: confirmButtonName }));

        expect(await screen.findByText('legal.translation.error.keyInvalid')).toBeInTheDocument();
        expect(onPublish).not.toHaveBeenCalled();
        // Modal stays open so the admin can skip or retry.
        expect(screen.getByRole('button', { name: skipButtonName })).toBeInTheDocument();
    });

    it('publishes directly without a modal when no translate callback is wired', async () => {
        const user = userEvent.setup();
        const onPublish = vi.fn();
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>' }}
                languages={['de', 'en']}
                defaultLanguage="de"
                versions={[]}
                onPublish={onPublish}
            />,
        );

        await user.click(screen.getByRole('button', { name: publishButtonName }));

        expect(onPublish).toHaveBeenCalledWith({ de: '<p>DE</p>' });
        expect(screen.queryByRole('button', { name: confirmButtonName })).not.toBeInTheDocument();
    });
});

describe('DataProcessingAgreementCard — per-field translate', () => {
    it('translates only the active language from the source and replaces the editor content', async () => {
        const user = userEvent.setup();
        const onTranslate = vi.fn().mockResolvedValue(translateResponse({ en: '<p>EN-MT</p>' }));
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>' }}
                languages={['de', 'en']}
                defaultLanguage="en"
                versions={[]}
                onPublish={() => undefined}
                onTranslate={onTranslate}
            />,
        );

        await user.click(screen.getByRole('button', { name: fieldButtonName }));

        await waitFor(() => expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>EN-MT</p>'));
        expect(onTranslate).toHaveBeenCalledWith({
            sourceLang: 'de',
            targetLangs: ['en'],
            texts: { content: '<p>DE</p>' },
        });
    });

    it('includes the translated field and its __meta when publishing afterwards (skip)', async () => {
        const user = userEvent.setup();
        const onPublish = vi.fn();
        const onTranslate = vi.fn().mockResolvedValue(translateResponse({ en: '<p>EN-MT</p>' }));
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>' }}
                languages={['de', 'en']}
                defaultLanguage="en"
                versions={[]}
                onPublish={onPublish}
                onTranslate={onTranslate}
            />,
        );

        await user.click(screen.getByRole('button', { name: fieldButtonName }));
        await waitFor(() => expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>EN-MT</p>'));

        await user.click(screen.getByRole('button', { name: publishButtonName }));
        await user.click(await screen.findByRole('button', { name: skipButtonName }));

        const published = onPublish.mock.calls[0][0];
        expect(published.en).toBe('<p>EN-MT</p>');
        expect(JSON.parse(published.en__meta)).toMatchObject({ mt: true, src: 'de' });
    });

    it('drops the fresh __meta again when the admin manually edits the translated field', async () => {
        const user = userEvent.setup();
        const onPublish = vi.fn();
        const onTranslate = vi.fn().mockResolvedValue(translateResponse({ en: '<p>EN-MT</p>' }));
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>' }}
                languages={['de', 'en']}
                defaultLanguage="en"
                versions={[]}
                onPublish={onPublish}
                onTranslate={onTranslate}
            />,
        );

        await user.click(screen.getByRole('button', { name: fieldButtonName }));
        await waitFor(() => expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>EN-MT</p>'));
        await user.click(screen.getByRole('button', { name: 'edit' }));

        await user.click(screen.getByRole('button', { name: publishButtonName }));
        await user.click(await screen.findByRole('button', { name: skipButtonName }));

        const published = onPublish.mock.calls[0][0];
        expect(published.en).toBe('<p>edited</p>');
        expect(published).not.toHaveProperty('en__meta');
    });

    it('shows the mapped human error message next to the button on failure', async () => {
        const user = userEvent.setup();
        const onTranslate = vi.fn().mockRejectedValue(new TranslationApiError('TRANSLATION_NO_CREDIT'));
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>' }}
                languages={['de', 'en']}
                defaultLanguage="en"
                versions={[]}
                onPublish={() => undefined}
                onTranslate={onTranslate}
            />,
        );

        await user.click(screen.getByRole('button', { name: fieldButtonName }));

        expect(await screen.findByText('legal.translation.error.noCredit')).toBeInTheDocument();
    });

    it('offers no per-field translate button on the source language', () => {
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>' }}
                languages={['de', 'en']}
                defaultLanguage="de"
                versions={[]}
                onPublish={() => undefined}
                onTranslate={vi.fn()}
            />,
        );

        expect(screen.queryByRole('button', { name: fieldButtonName })).not.toBeInTheDocument();
    });
});
