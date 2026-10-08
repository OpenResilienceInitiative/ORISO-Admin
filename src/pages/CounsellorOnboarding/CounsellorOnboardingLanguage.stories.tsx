import { useMemo } from 'react';
import { createInstance } from 'i18next';
import { I18nextProvider, getI18n } from 'react-i18next';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook's subpath export
import { expect, waitFor, within } from 'storybook/test';
import { ThemeProvider } from '@mui/material/styles';
import appI18n from '../../i18n';
import translationDe from '../../locales/de/translation.json';
import translationEn from '../../locales/en/translation.json';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { LanguageSelector } from '../../components/LanguageSelector';
import { createStubCounsellorOnboardingClient } from '../../api/counsellorOnboarding/counsellorOnboarding';
import { CounsellorOnboarding } from './CounsellorOnboarding';

/** An isolated locale instance keeps this language-switch story from changing other stories. */
const LanguageExample = ({ twoFactor = false }: { twoFactor?: boolean }) => {
    const { locale: storyLocale, client: storyClient } = useMemo(() => {
        const locale = createInstance();
        // The provider supplies this instance; the React plugin would replace the app-wide default.
        locale.init({
            lng: 'de',
            fallbackLng: 'de',
            initImmediate: false,
            keySeparator: false,
            interpolation: { escapeValue: false },
            resources: { de: { translation: translationDe }, en: { translation: translationEn } },
        });
        const topics = [
            { id: 21, de: 'Rechtliche Betreuung und Vorsorge', en: 'Legal guardianship and advance directives' },
            { id: 22, de: 'Allgemeine Sozialberatung', en: 'General social counselling' },
            { id: 23, de: 'Kinder und Jugendliche', en: 'Children and young people' },
            { id: 24, de: 'Eltern und Familie', en: 'Parents and family' },
            { id: 25, de: 'Schulden', en: 'Debt' },
            { id: 26, de: 'Sucht', en: 'Addiction' },
            { id: 27, de: 'Migration', en: 'Migration' },
        ];
        const client = createStubCounsellorOnboardingClient({
            latencyMs: 0,
            inviteState: twoFactor ? 'PENDING_2FA_ACTIVATION' : 'VALID',
        });
        const resolve = client.getOnboardingInvite;
        client.getOnboardingInvite = async (token) => {
            const invite = await resolve(token);
            const language = locale.resolvedLanguage === 'en' ? 'en' : 'de';
            const localized = topics.map((topic) => ({ id: topic.id, name: topic[language] }));
            return {
                ...invite,
                agencyExists: false,
                departmentId: null,
                topics: [localized[0]],
                availableTopics: localized,
            };
        };
        return { locale, client };
    }, [twoFactor]);
    return (
        <I18nextProvider i18n={storyLocale}>
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ background: 'var(--m3-surface-container-high)', padding: 16 }}>
                    <LanguageSelector />
                    <div style={{ width: 'min(560px, 100%)', paddingTop: 16 }}>
                        <CounsellorOnboarding inviteToken="storybook-language-example" client={storyClient} />
                    </div>
                </div>
            </ThemeProvider>
        </I18nextProvider>
    );
};

const meta = {
    title: 'Pages/CounsellorOnboarding/Topic language',
    component: LanguageExample,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof LanguageExample>;
export default meta;
type Story = StoryObj<typeof meta>;

export const LanguageSwitch: Story = {
    name: 'DE → EN → DE keeps entered data and selected topics',
    play: async ({ canvas, userEvent }) => {
        const body = within(document.body);
        await expect(await canvas.findByText('Rechtliche Betreuung und Vorsorge')).toBeVisible();
        await userEvent.type(canvas.getByLabelText('Anzeigename für Ratsuchende'), 'Georgia');
        await userEvent.type(canvas.getByLabelText('Name der Beratungsstelle'), 'Georgias Beratungsstelle');
        await userEvent.click(canvas.getByRole('button', { name: 'Thema hinzufügen' }));
        await userEvent.click(await body.findByRole('menuitem', { name: 'Schulden' }));
        await userEvent.click(canvas.getByRole('combobox', { name: /Sprache|language/i }));
        await userEvent.click(await body.findByText('(EN) Englisch'));
        await expect(await canvas.findByText('Legal guardianship and advance directives')).toBeVisible();
        await expect(await canvas.findByText('Debt')).toBeVisible();
        await expect(canvas.getByLabelText('Display name for advice seekers')).toHaveValue('Georgia');
        await expect(canvas.getByLabelText('Name of the counselling centre')).toHaveValue('Georgias Beratungsstelle');
        await userEvent.click(canvas.getByRole('button', { name: 'Add topic' }));
        await waitFor(() => expect(body.getByRole('menuitem', { name: 'General social counselling' })).toBeVisible());
        await expect(body.queryByRole('menuitem', { name: 'Allgemeine Sozialberatung' })).not.toBeInTheDocument();
        await userEvent.click(body.getByRole('menuitem', { name: 'General social counselling' }));
        await userEvent.click(canvas.getByRole('combobox', { name: /Sprache|language/i }));
        await userEvent.click(await body.findByText('(DE) German'));
        await expect(await canvas.findByText('Rechtliche Betreuung und Vorsorge')).toBeVisible();
        await expect(await canvas.findByText('Schulden')).toBeVisible();
        await expect(canvas.getByLabelText('Anzeigename für Ratsuchende')).toHaveValue('Georgia');
        await expect(canvas.getByLabelText('Name der Beratungsstelle')).toHaveValue('Georgias Beratungsstelle');
    },
};

export const Phone: Story = {
    ...LanguageSwitch,
    globals: { viewport: { value: 'phone', isRotated: false } },
    parameters: { chromatic: { viewports: [390] } },
};

export const TwoFactorLanguage: Story = {
    name: 'Email second factor — DE and EN',
    args: { twoFactor: true },
    play: async ({ canvas, userEvent }) => {
        const body = within(document.body);
        await userEvent.click(await canvas.findByRole('button', { name: 'Code per E-Mail senden' }));
        await expect(await canvas.findByLabelText('Einmalcode')).toBeVisible();
        await userEvent.click(canvas.getByRole('combobox', { name: /Sprache|language/i }));
        await userEvent.click(await body.findByText('(EN) Englisch'));
        await expect(await canvas.findByRole('button', { name: 'Send new code' })).toBeVisible();
        await expect(canvas.getByLabelText('One-time code')).toBeVisible();
        await expect(canvas.getByRole('radio', { name: 'E-mail address' })).toBeChecked();
        await expect(getI18n()).toBe(appI18n);
    },
};
