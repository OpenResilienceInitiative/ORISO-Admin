import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

        fireEvent.click(publishButton());
        fireEvent.click(await screen.findByRole('button', { name: 'legal.translation.modal.confirm' }));

        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
        expect(translate).toHaveBeenCalledWith({
            sourceLang: 'de',
            targetLangs: ['en', 'fr'],
            texts: { erstantwortGreeting: '<p>Guten Tag</p>' },
        });
        const greeting = publishedContent().erstantwortGreeting;
        expect(greeting.de).toBe('<p>Guten Tag</p>');
        expect(greeting.en).toBe('<p>Hello</p>');
        expect(greeting.fr).toBe('<p>Bonjour</p>');
        expect(JSON.parse(greeting.en__meta)).toEqual({ mt: true, src: 'de', at: expect.any(String) });
    });

    it('sends the short source language "de" to the translation service even when the Träger writes informally', async () => {
        useSingleTenantData.mockReturnValue(tenantWith(['de', 'en'], {}, false));
        translate.mockResolvedValue({ translations: { en: { erstantwortGreeting: '<p>Hello</p>' } } });
        renderSettings();

        fireEvent.click(publishButton());
        fireEvent.click(await screen.findByRole('button', { name: 'legal.translation.modal.confirm' }));

        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
        expect(translate).toHaveBeenCalledWith({
            sourceLang: 'de',
            targetLangs: ['en'],
            texts: { erstantwortGreeting: '<p>Guten Tag</p>' },
        });
        const greeting = publishedContent().erstantwortGreeting;
        expect(greeting['de@informal']).toBe('<p>Guten Tag</p>');
        expect(JSON.parse(greeting.en__meta).src).toBe('de@informal');
    });

    it('sends an emptied German text as "" inside the full map, with the other languages kept', async () => {
        useSingleTenantData.mockReturnValue(
            tenantWith(['de'], { erstantwortGreeting: { de: '<p>Guten Tag</p>', en: '<p>Hello</p>' } }),
        );
        renderSettings();

        typeIntoGreeting('<p></p>');
        fireEvent.click(publishButton());

        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
        expect(publishedContent().erstantwortGreeting).toEqual({ de: '', en: '<p>Hello</p>' });
    });

    it('publishes nothing and names the failure when the translation service refuses', async () => {
        useSingleTenantData.mockReturnValue(tenantWith(['de', 'en']));
        translate.mockRejectedValue(new TranslationApiError('TRANSLATION_NO_CREDIT', 'openrouter'));
        renderSettings();

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
});
