import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const { usePlatformTexts, save, translate } = vi.hoisted(() => ({
    usePlatformTexts: vi.fn(),
    save: vi.fn(),
    translate: vi.fn(),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
    Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));

vi.mock('../../../../../hooks/useErstantwortPlatformTexts.hook', () => ({
    useErstantwortPlatformTexts: () => usePlatformTexts(),
    useSaveErstantwortPlatformTexts: () => ({ mutateAsync: save, isPending: false }),
}));

vi.mock('../../../../../hooks/useTranslateLegalContent.hook', () => ({
    useTranslateLegalContent: () => ({ translate, isTranslating: false }),
}));

vi.mock('../../../LegalSettings/components/LegalContentLanguageSelect', () => ({
    LegalContentLanguageSelect: ({ languages, value, onChange }: any) => (
        <select aria-label="language" value={value} onChange={(e) => onChange(e.target.value)}>
            {languages.map((language: string) => (
                <option key={language} value={language}>
                    {language}
                </option>
            ))}
        </select>
    ),
}));

vi.mock('../../../../FormPluginEditor/M3RichTextEditor', () => ({
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
import { PlatformGreetingSettings } from './index';

const builtIn = {
    greeting: { de: 'Schön, dass Sie sich gemeldet haben.', en: 'Thank you for getting in touch.' },
    closing: { de: 'Bis bald.', en: 'See you soon.' },
    emergencyNumbers: { de: 'Telefonseelsorge 0800 111 0 111', en: 'Telefonseelsorge (en)' },
};

const loaded = (texts: Record<string, Record<string, string>> = {}) => ({
    data: { texts, builtIn },
    isLoading: false,
    isError: false,
});

const greetingEditor = () => screen.getByLabelText('settings.greeting.greeting.label');
const publish = () => fireEvent.click(screen.getByRole('button', { name: 'settings.greeting.publish' }));
const saved = () => save.mock.calls[0][0] as Record<string, Record<string, string>>;

beforeEach(() => {
    usePlatformTexts.mockReset().mockReturnValue(loaded({ greeting: { de: '<p>Hallo Plattform</p>' } }));
    save.mockReset().mockResolvedValue({});
    translate.mockReset();
});

afterEach(cleanup);

describe('PlatformGreetingSettings', () => {
    it("shows the platform admin's stored text and the Caritas default for the chosen language", () => {
        render(<PlatformGreetingSettings />);

        expect(greetingEditor()).toHaveValue('<p>Hallo Plattform</p>');
        expect(screen.getByTestId('platform-greeting-builtin')).toHaveTextContent(builtIn.greeting.de);
    });

    it('edits every one of the seven language versions', () => {
        render(<PlatformGreetingSettings />);
        const options = Array.from(screen.getByLabelText('language').querySelectorAll('option')).map((o) => o.value);
        expect(options).toEqual(['de', 'de@informal', 'en', 'fr', 'ru', 'tr', 'ti']);

        fireEvent.change(screen.getByLabelText('language'), { target: { value: 'en' } });

        expect(greetingEditor()).toHaveValue('');
        expect(screen.getByTestId('platform-greeting-builtin')).toHaveTextContent(builtIn.greeting.en);
    });

    it('translates a changed German text into all other languages and publishes it with markers', async () => {
        translate.mockResolvedValue({ translations: { en: { greeting: '<p>Hello platform</p>' } } });
        render(<PlatformGreetingSettings />);

        fireEvent.change(greetingEditor(), { target: { value: '<p>Neu</p>' } });
        publish();
        fireEvent.click(await screen.findByRole('button', { name: 'legal.translation.modal.confirm' }));

        await waitFor(() => expect(save).toHaveBeenCalled());
        expect(translate).toHaveBeenCalledWith({
            sourceLang: 'de',
            targetLangs: ['en', 'fr', 'ru', 'tr', 'ti'],
            texts: { greeting: '<p>Neu</p>' },
        });
        expect(saved().greeting.de).toBe('<p>Neu</p>');
        expect(saved().greeting.en).toBe('<p>Hello platform</p>');
        expect(JSON.parse(saved().greeting.en__meta)).toMatchObject({ mt: true, src: 'de' });
    });

    it('drops stale translations when the admin publishes without translating', async () => {
        usePlatformTexts.mockReturnValue(
            loaded({ greeting: { de: '<p>Alt</p>', en: '<p>Old</p>', en__meta: '{"mt":true}' } }),
        );
        render(<PlatformGreetingSettings />);

        fireEvent.change(greetingEditor(), { target: { value: '<p>Neu</p>' } });
        publish();
        fireEvent.click(await screen.findByRole('button', { name: 'legal.translation.modal.skip' }));

        await waitFor(() => expect(save).toHaveBeenCalled());
        expect(translate).not.toHaveBeenCalled();
        expect(saved().greeting).toEqual({ de: '<p>Neu</p>', en: '', en__meta: '' });
    });

    it('publishes a hand-edited translation without asking to translate', async () => {
        render(<PlatformGreetingSettings />);
        fireEvent.change(screen.getByLabelText('language'), { target: { value: 'fr' } });

        fireEvent.change(greetingEditor(), { target: { value: '<p>Bonjour</p>' } });
        publish();

        await waitFor(() => expect(save).toHaveBeenCalled());
        expect(saved().greeting).toEqual({ de: '<p>Hallo Plattform</p>', fr: '<p>Bonjour</p>' });
    });

    it('resets a Baustein to the Caritas default in every language', async () => {
        usePlatformTexts.mockReturnValue(loaded({ greeting: { de: '<p>Hallo</p>', en: '<p>Hi</p>' } }));
        render(<PlatformGreetingSettings />);

        fireEvent.click(screen.getByRole('button', { name: 'settings.greeting.reset' }));
        publish();

        await waitFor(() => expect(save).toHaveBeenCalled());
        expect(saved().greeting).toEqual({ de: '', en: '' });
    });

    it('says the texts could not be loaded instead of showing an empty editor', () => {
        usePlatformTexts.mockReturnValue({ data: undefined, isLoading: false, isError: true });
        render(<PlatformGreetingSettings />);

        expect(screen.queryByLabelText('settings.greeting.greeting.label')).not.toBeInTheDocument();
        expect(screen.getByText('message.error.default')).toBeInTheDocument();
    });
});
