import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TranslationApiError } from '../../../../api/tenant/translation';

const { useSingleTenantData, mutateAsync, translate } = vi.hoisted(() => ({
    useSingleTenantData: vi.fn(),
    mutateAsync: vi.fn(),
    translate: vi.fn(),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
    Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));

vi.mock('../../../../hooks/useSingleTenantData', () => ({
    useSingleTenantData: (args: unknown) => useSingleTenantData(args),
}));

vi.mock('../../../../hooks/useTenantAdminDataMutation.hook', () => ({
    useTenantAdminDataMutation: () => ({ mutateAsync, isPending: false }),
}));

vi.mock('../../../../hooks/useTranslateLegalContent.hook', () => ({
    useTranslateLegalContent: () => ({ translate, isTranslating: false }),
}));

/* Same stand-in as the card test: the rich-text editor is not what this container is
   about. The stub keeps the value, the change and the read-only state observable. */
vi.mock('../../../FormPluginEditor/M3RichTextEditor', () => ({
    M3RichTextEditor: ({ title, value, onChange, readOnly }: any) => (
        <div>
            <label htmlFor={`ed-${title}`}>{title}</label>
            <textarea
                id={`ed-${title}`}
                value={value ?? ''}
                disabled={readOnly}
                onChange={(e) => onChange?.(e.target.value)}
            />
        </div>
    ),
}));

// eslint-disable-next-line import/first
import { ErstantwortSettings } from './index';

const tenantWith = (activeLanguages: string[], content: Record<string, unknown> = {}, languageFormal = true) => ({
    data: {
        id: 7,
        settings: { activeLanguages, extendedSettings: { languageFormal } },
        content: {
            erstantwortGreeting: { [languageFormal ? 'de' : 'de@informal']: '<p>Guten Tag</p>' },
            erstantwortWhoReadsAlong: { [languageFormal ? 'de' : 'de@informal']: '<p>Our counselling team</p>' },
            ...content,
        },
    },
    isLoading: false,
    isError: false,
});

const publishedContent = () => (mutateAsync.mock.calls[0][0] as { content: Record<string, any> }).content;

const renderSettings = (readOnly = false) => render(<ErstantwortSettings tenantId="7" readOnly={readOnly} />);

const typeIntoGreeting = (text: string) => {
    fireEvent.change(screen.getByLabelText('tenants.erstantwort.greeting.label'), { target: { value: text } });
};

const publishButton = () => screen.getByRole('button', { name: 'tenants.erstantwort.publish' });

beforeEach(() => {
    mutateAsync.mockReset().mockResolvedValue({});
    translate.mockReset();
    useSingleTenantData.mockReset().mockReturnValue(tenantWith(['de']));
});

afterEach(cleanup);

describe('ErstantwortSettings', () => {
    it('shows the Träger text that is already stored', () => {
        renderSettings();

        expect(screen.getByLabelText('tenants.erstantwort.greeting.label')).toHaveValue('<p>Guten Tag</p>');
    });

    it('publishes the edited German text without a translation call when no other language is active', async () => {
        renderSettings();

        typeIntoGreeting('<p>Neu</p>');
        fireEvent.click(publishButton());

        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
        expect(translate).not.toHaveBeenCalled();
        expect(publishedContent().erstantwortGreeting).toEqual({ de: '<p>Neu</p>' });
    });

    it('translates the German texts in one call and stores each translation with its __meta marker', async () => {
        useSingleTenantData.mockReturnValue(tenantWith(['de', 'en', 'fr']));
        translate.mockResolvedValue({
            translations: {
                en: { erstantwortGreeting: '<p>Hello</p>' },
                fr: { erstantwortGreeting: '<p>Bonjour</p>' },
            },
            provider: 'openrouter',
            model: 'test-model',
        });
        renderSettings();

        typeIntoGreeting('<p>Guten Tag!</p>');
        fireEvent.click(publishButton());
        fireEvent.click(await screen.findByRole('button', { name: 'legal.translation.modal.confirm' }));

        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
        expect(translate).toHaveBeenCalledWith({
            sourceLang: 'de',
            targetLangs: ['en', 'fr'],
            texts: { erstantwortGreeting: '<p>Guten Tag!</p>' },
        });
        const greeting = publishedContent().erstantwortGreeting;
        expect(greeting.de).toBe('<p>Guten Tag!</p>');
        expect(greeting.en).toBe('<p>Hello</p>');
        expect(greeting.fr).toBe('<p>Bonjour</p>');
        expect(JSON.parse(greeting.en__meta)).toEqual({ mt: true, src: 'de', at: expect.any(String) });
    });

    it('sends the short source language "de" to the translation service even when the Träger writes informally', async () => {
        useSingleTenantData.mockReturnValue(tenantWith(['de', 'en'], {}, false));
        translate.mockResolvedValue({ translations: { en: { erstantwortGreeting: '<p>Hello</p>' } } });
        renderSettings();

        typeIntoGreeting('<p>Guten Tag!</p>');
        fireEvent.click(publishButton());
        fireEvent.click(await screen.findByRole('button', { name: 'legal.translation.modal.confirm' }));

        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
        expect(translate).toHaveBeenCalledWith({
            sourceLang: 'de',
            targetLangs: ['en'],
            texts: { erstantwortGreeting: '<p>Guten Tag!</p>' },
        });
        const greeting = publishedContent().erstantwortGreeting;
        expect(greeting['de@informal']).toBe('<p>Guten Tag!</p>');
        expect(JSON.parse(greeting.en__meta).src).toBe('de@informal');
    });

    it('sends an emptied German text as "" and blanks the other languages of that text', async () => {
        useSingleTenantData.mockReturnValue(
            tenantWith(['de'], { erstantwortGreeting: { de: '<p>Guten Tag</p>', en: '<p>Hello</p>' } }),
        );
        renderSettings();

        typeIntoGreeting('<p></p>');
        fireEvent.click(publishButton());

        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
        expect(publishedContent().erstantwortGreeting).toEqual({ de: '', en: '', en__meta: '' });
    });

    it('publishes nothing and names the failure when the translation service refuses', async () => {
        useSingleTenantData.mockReturnValue(tenantWith(['de', 'en']));
        translate.mockRejectedValue(new TranslationApiError('TRANSLATION_NO_CREDIT', 'openrouter'));
        renderSettings();

        typeIntoGreeting('<p>Guten Tag!</p>');
        fireEvent.click(publishButton());
        fireEvent.click(await screen.findByRole('button', { name: 'legal.translation.modal.confirm' }));

        expect(await screen.findByText('legal.translation.error.noCredit')).toBeInTheDocument();
        expect(mutateAsync).not.toHaveBeenCalled();
    });

    it('publishes the untranslated German text when the Träger skips the translation', async () => {
        useSingleTenantData.mockReturnValue(tenantWith(['de', 'en']));
        renderSettings();

        typeIntoGreeting('<p>Neu</p>');
        fireEvent.click(publishButton());
        fireEvent.click(await screen.findByRole('button', { name: 'legal.translation.modal.skip' }));

        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
        expect(translate).not.toHaveBeenCalled();
        expect(publishedContent().erstantwortGreeting).toEqual({ de: '<p>Neu</p>' });
    });

    it('sends the deadline only when the Träger changed it, and a cleared deadline as 0', async () => {
        useSingleTenantData.mockReturnValue(tenantWith(['de'], { erstantwortResponseDeadlineDays: 3 }));
        renderSettings();

        fireEvent.change(screen.getByLabelText('tenants.erstantwort.deadline.label'), { target: { value: '' } });
        fireEvent.click(publishButton());

        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
        expect(publishedContent()).toHaveProperty('erstantwortResponseDeadlineDays', 0);
    });

    it('offers no publish action to someone who may only read the texts', () => {
        renderSettings(true);

        expect(screen.queryByRole('button', { name: 'tenants.erstantwort.publish' })).not.toBeInTheDocument();
        expect(screen.getByLabelText('tenants.erstantwort.greeting.label')).toBeDisabled();
    });

    it('shows an error instead of a blank card when the stored texts cannot be read', () => {
        useSingleTenantData.mockReturnValue({ data: undefined, isLoading: false, isError: true });
        renderSettings();

        expect(screen.getByText('message.error.default')).toBeInTheDocument();
        expect(screen.queryByLabelText('tenants.erstantwort.greeting.label')).not.toBeInTheDocument();
    });

    it('opens the translation dialog by itself after a text change, and not for an untouched text', async () => {
        useSingleTenantData.mockReturnValue(tenantWith(['de', 'en']));
        renderSettings();

        fireEvent.click(publishButton());
        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
        expect(screen.queryByRole('button', { name: 'legal.translation.modal.confirm' })).not.toBeInTheDocument();

        mutateAsync.mockClear();
        typeIntoGreeting('<p>Anders</p>');
        fireEvent.click(publishButton());
        expect(await screen.findByRole('button', { name: 'legal.translation.modal.confirm' })).toBeInTheDocument();
    });

    it('deletes the other language versions of a changed text and keeps those of unchanged texts', async () => {
        useSingleTenantData.mockReturnValue(
            tenantWith(['de'], {
                erstantwortGreeting: {
                    de: '<p>Guten Tag</p>',
                    en: '<p>Hello</p>',
                    en__meta: '{"mt":true,"src":"de","at":"x"}',
                },
                erstantwortClosing: {
                    de: '<p>Tschüss</p>',
                    en: '<p>Bye</p>',
                    en__meta: '{"mt":true,"src":"de","at":"x"}',
                },
            }),
        );
        renderSettings();

        typeIntoGreeting('<p>Neu</p>');
        fireEvent.click(publishButton());

        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
        expect(publishedContent().erstantwortGreeting).toEqual({ de: '<p>Neu</p>', en: '', en__meta: '' });
        expect(publishedContent().erstantwortClosing.en).toBe('<p>Bye</p>');
    });

    it('publishes only the original-language text when the translation dialog is skipped', async () => {
        useSingleTenantData.mockReturnValue(
            tenantWith(['de', 'en'], {
                erstantwortGreeting: { de: '<p>Guten Tag</p>', en: '<p>Hello</p>', en__meta: '{"mt":true,"src":"de"}' },
            }),
        );
        renderSettings();

        typeIntoGreeting('<p>Neu</p>');
        fireEvent.click(publishButton());
        fireEvent.click(await screen.findByRole('button', { name: 'legal.translation.modal.skip' }));

        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
        expect(translate).not.toHaveBeenCalled();
        expect(publishedContent().erstantwortGreeting).toEqual({ de: '<p>Neu</p>', en: '', en__meta: '' });
    });

    it('translates only the changed texts', async () => {
        useSingleTenantData.mockReturnValue(
            tenantWith(['de', 'en'], { erstantwortClosing: { de: '<p>Tschüss</p>', en: '<p>Bye</p>' } }),
        );
        translate.mockResolvedValue({ translations: { en: { erstantwortGreeting: '<p>Changed</p>' } } });
        renderSettings();

        typeIntoGreeting('<p>Geändert</p>');
        fireEvent.click(publishButton());
        fireEvent.click(await screen.findByRole('button', { name: 'legal.translation.modal.confirm' }));

        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
        expect(translate).toHaveBeenCalledWith(
            expect.objectContaining({ texts: { erstantwortGreeting: '<p>Geändert</p>' } }),
        );
        expect(publishedContent().erstantwortClosing.en).toBe('<p>Bye</p>');
    });
    it.each([['de'], ['de', 'en']])(
        'blocks both publish paths when the required disclosure is empty (%j)',
        async (...languages) => {
            useSingleTenantData.mockReturnValue(tenantWith(languages, { erstantwortWhoReadsAlong: { de: '<p></p>' } }));
            renderSettings();
            typeIntoGreeting('<p>Keep this edit</p>');
            fireEvent.click(publishButton());
            expect(await screen.findByRole('alert')).toHaveTextContent('tenants.erstantwort.whoReadsAlong');
            expect(mutateAsync).not.toHaveBeenCalled();
            expect(translate).not.toHaveBeenCalled();
            expect(screen.queryByRole('button', { name: 'legal.translation.modal.confirm' })).not.toBeInTheDocument();
            expect(screen.getByLabelText('tenants.erstantwort.greeting.label')).toHaveValue('<p>Keep this edit</p>');
        },
    );

    it('shows the default placeholder for a stored zero deadline', () => {
        useSingleTenantData.mockReturnValue(tenantWith(['de'], { erstantwortResponseDeadlineDays: 0 }));
        renderSettings();
        expect(screen.getByLabelText('tenants.erstantwort.deadline.label')).toHaveValue('');
        expect(screen.getByLabelText('tenants.erstantwort.deadline.label')).toHaveAttribute('placeholder', '2');
    });

    it('retries a failed save with the successful translations without paying for translation again', async () => {
        useSingleTenantData.mockReturnValue(tenantWith(['de', 'en']));
        mutateAsync.mockRejectedValueOnce(new Error('temporary save failure')).mockResolvedValue({});
        translate.mockResolvedValue({ translations: { en: { erstantwortGreeting: '<p>Hello again</p>' } } });
        renderSettings();
        typeIntoGreeting('<p>New source</p>');
        fireEvent.click(publishButton());
        fireEvent.click(await screen.findByRole('button', { name: 'legal.translation.modal.confirm' }));
        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
        fireEvent.click(publishButton());
        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
        expect(translate).toHaveBeenCalledTimes(1);
        expect(mutateAsync.mock.calls[1][0].content.erstantwortGreeting.en).toBe('<p>Hello again</p>');
    });
    it('translates the new source again if it changes after a failed save', async () => {
        useSingleTenantData.mockReturnValue(tenantWith(['de', 'en']));
        mutateAsync.mockRejectedValueOnce(new Error('temporary save failure')).mockResolvedValue({});
        translate.mockResolvedValue({ translations: { en: { erstantwortGreeting: '<p>Translated</p>' } } });
        renderSettings();
        typeIntoGreeting('<p>First source</p>');
        fireEvent.click(publishButton());
        fireEvent.click(await screen.findByRole('button', { name: 'legal.translation.modal.confirm' }));
        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
        typeIntoGreeting('<p>Second source</p>');
        fireEvent.click(publishButton());
        fireEvent.click(await screen.findByRole('button', { name: 'legal.translation.modal.confirm' }));
        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
        expect(translate).toHaveBeenCalledTimes(2);
        expect(translate).toHaveBeenLastCalledWith(
            expect.objectContaining({ texts: { erstantwortGreeting: '<p>Second source</p>' } }),
        );
    });
    it('does not reuse a failed-save translation when the target languages change', async () => {
        useSingleTenantData.mockReturnValue(tenantWith(['de', 'en']));
        mutateAsync.mockRejectedValueOnce(new Error('temporary save failure')).mockResolvedValue({});
        translate.mockResolvedValue({ translations: { en: { erstantwortGreeting: '<p>Translated</p>' } } });
        const view = renderSettings();
        typeIntoGreeting('<p>New source</p>');
        fireEvent.click(publishButton());
        fireEvent.click(await screen.findByRole('button', { name: 'legal.translation.modal.confirm' }));
        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
        useSingleTenantData.mockReturnValue(tenantWith(['de', 'en', 'fr']));
        view.rerender(<ErstantwortSettings tenantId="7" />);
        fireEvent.click(publishButton());
        fireEvent.click(await screen.findByRole('button', { name: 'legal.translation.modal.confirm' }));
        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
        expect(translate).toHaveBeenCalledTimes(2);
        expect(translate).toHaveBeenLastCalledWith(expect.objectContaining({ targetLangs: ['en', 'fr'] }));
    });

    it('does not replay a failed-save translation for another tenant', async () => {
        useSingleTenantData.mockReturnValue(tenantWith(['de', 'en']));
        mutateAsync.mockRejectedValueOnce(new Error('temporary save failure')).mockResolvedValue({});
        translate.mockResolvedValue({ translations: { en: { erstantwortGreeting: '<p>Translated</p>' } } });
        const view = renderSettings();
        typeIntoGreeting('<p>New source</p>');
        fireEvent.click(publishButton());
        fireEvent.click(await screen.findByRole('button', { name: 'legal.translation.modal.confirm' }));
        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
        view.rerender(<ErstantwortSettings tenantId="8" />);
        fireEvent.click(publishButton());
        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
        expect(translate).toHaveBeenCalledTimes(1);
        expect(mutateAsync.mock.calls[1][0].content.erstantwortGreeting).toEqual({ de: '<p>Guten Tag</p>' });
    });
    it('does not save a translation that completes after switching tenants', async () => {
        useSingleTenantData.mockReturnValue(tenantWith(['de', 'en']));
        let finishTranslation!: (value: { translations: Record<string, Record<string, string>> }) => void;
        translate.mockImplementation(
            () =>
                new Promise((resolve) => {
                    finishTranslation = resolve;
                }),
        );
        const view = renderSettings();
        typeIntoGreeting('<p>Tenant A source</p>');
        fireEvent.click(publishButton());
        fireEvent.click(await screen.findByRole('button', { name: 'legal.translation.modal.confirm' }));
        await waitFor(() => expect(translate).toHaveBeenCalledTimes(1));
        view.rerender(<ErstantwortSettings tenantId="8" />);
        typeIntoGreeting('<p>Tenant B draft</p>');
        await act(async () => {
            finishTranslation({ translations: { en: { erstantwortGreeting: '<p>Tenant A translation</p>' } } });
        });
        await waitFor(() =>
            expect(screen.getByLabelText('tenants.erstantwort.greeting.label')).toHaveValue('<p>Tenant B draft</p>'),
        );
        expect(mutateAsync).not.toHaveBeenCalled();
    });

    it('keeps the new tenant draft when an older tenant save completes', async () => {
        let finishSave!: (value: object) => void;
        mutateAsync.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    finishSave = resolve;
                }),
        );
        const view = renderSettings();
        typeIntoGreeting('<p>Tenant A source</p>');
        fireEvent.click(publishButton());
        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
        view.rerender(<ErstantwortSettings tenantId="8" />);
        typeIntoGreeting('<p>Tenant B draft</p>');
        await act(async () => {
            finishSave({});
        });
        await waitFor(() =>
            expect(screen.getByLabelText('tenants.erstantwort.greeting.label')).toHaveValue('<p>Tenant B draft</p>'),
        );
    });
});
