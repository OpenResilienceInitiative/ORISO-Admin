import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConfigProvider, Form } from 'antd';
import { http, HttpResponse } from 'msw';
import { ThemeProvider } from '@mui/material/styles';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { expect, within } from 'storybook/test';
import i18n from '../../i18n';
import { UserRole } from '../../enums/UserRole';
import { AgencySettings } from '../../pages/Agency/Edit/components/AgencySettings';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { buildAdminAntdTheme } from '../../theme/antdM3Theme';
import { applyAdminInvertedTheme, clearAdminInvertedThemeTokens } from '../../utils/applyAdminTheme';
import { setStoryAuth, withAdminProviders } from '../../utils/storybook/adminStoryDecorators';
import { OtherFunctionsSettings } from '../Tenants/AppSettings/OtherFunctionsSettings';

type Language = 'de' | 'en';
type Scheme = 'light' | 'inverted';

interface StoryArgs {
    language: Language;
    scheme: Scheme;
}

/**
 * Where each team function can be set, with the real components side by side. Both functions read
 * their name and description from `teamFunctions.*` (see `teamFunctions.ts`), so the same function
 * reads identically wherever it is reached.
 *
 * | Function | Saved key | Set at |
 * | --- | --- | --- |
 * | Teamberatung / Team counselling | `teamAgency` | Beratungsstelle: create form and Stammdaten → Einstellungen |
 * | Team-Chat / Team chat | `featureTeamDiscussionEnabled` | Träger: Funktionen → Weitere Funktionen |
 *
 * The `scheme` control (light / inverted) previews the experimental inverted scheme; it has no story of its
 * own because several existing Admin cards are not legible in it yet (the product has no dark mode).
 *
 * Not (yet) a place: the first-centre setup page (`AgencySetupPage`) only collects address, contact and
 * opening hours, and the Mail counselling card in Funktionszugriff has no team switch.
 */

// Story furniture only (not product copy): captions of the panels, in the story's language.
const CAPTIONS: Record<Language, Record<'tenant' | 'agencyEdit' | 'agencyCreate', string>> = {
    de: {
        tenant: 'Träger → Funktionen → Weitere Funktionen',
        agencyEdit: 'Beratungsstelle → Stammdaten → Einstellungen',
        agencyCreate: 'Beratungsstelle anlegen',
    },
    en: {
        tenant: 'Provider → Functions → Other functions',
        agencyEdit: 'Counselling centre → Master data → Settings',
        agencyCreate: 'Create counselling centre',
    },
};

const TENANT = { id: 7, name: 'Träger Süd', settings: { featureTeamDiscussionEnabled: true } };

const handlers = [
    // OtherFunctionsSettings reads the Träger's policies (ORISO-TenantService#363).
    http.get('*/service/tenantadmin/:id/permission-policies', () => HttpResponse.json({ tenantId: 7, policies: {} })),
    http.get('*/service/tenantadmin/:id', () => HttpResponse.json(TENANT)),
    http.put('*/service/tenantadmin/:id', () => HttpResponse.json(TENANT)),
    http.get('*/service/tenant/public/*', () => HttpResponse.json({ id: 7, settings: {} })),
    http.get('*/service/tenant/:id', () => HttpResponse.json({ id: 7, settings: {} })),
    http.get('*/service/topic/', () => HttpResponse.json([])),
];

const Panel = ({ caption, children }: { caption: string; children: ReactNode }) => (
    <section style={{ display: 'flex', minWidth: 0, flexDirection: 'column', gap: 8 }}>
        <h2
            style={{
                margin: 0,
                font: '600 12px/16px system-ui, sans-serif',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--m3-on-surface-variant, #444748)',
            }}
        >
            {caption}
        </h2>
        {children}
    </section>
);

const AgencyForm = ({ children, teamAgency }: { children: ReactNode; teamAgency: boolean }) => (
    <Form layout="vertical" initialValues={{ teamAgency, settings: { counsellorTopicPermission: 'CREATE' } }}>
        {children}
    </Form>
);

/** `scheme` is applied by the story's decorator, not by the panels. */
const TeamFunctionsEverywhere = ({ language }: StoryArgs) => (
    <div
        style={{
            display: 'grid',
            gap: 24,
            padding: 24,
            alignItems: 'start',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
        }}
    >
        <Panel caption={CAPTIONS[language].tenant}>
            <OtherFunctionsSettings tenantId="7" />
        </Panel>
        <Panel caption={CAPTIONS[language].agencyEdit}>
            <AgencyForm teamAgency>
                <AgencySettings isEditMode persistedTeamAgency />
            </AgencyForm>
        </Panel>
        <Panel caption={CAPTIONS[language].agencyCreate}>
            <AgencyForm teamAgency={false}>
                <AgencySettings isEditMode={false} persistedTeamAgency={false} />
            </AgencyForm>
        </Panel>
    </div>
);

const meta = {
    title: 'Admin/Settings/Team functions',
    component: TeamFunctionsEverywhere,
    parameters: { layout: 'fullscreen', msw: { handlers } },
    args: { language: 'de', scheme: 'light' },
    argTypes: {
        language: { control: 'inline-radio', options: ['de', 'en'] },
        scheme: { control: 'inline-radio', options: ['light', 'inverted'] },
    },
    // Language and colour scheme are story-owned and restored afterwards.
    beforeEach: async ({ args }) => {
        const { language, scheme } = args;
        const previousLanguage = i18n.language;
        await i18n.changeLanguage(language);
        if (scheme === 'inverted') applyAdminInvertedTheme(null);
        return async () => {
            clearAdminInvertedThemeTokens();
            await i18n.changeLanguage(previousLanguage);
        };
    },
    decorators: [
        (Story, { args }) => {
            const { scheme } = args;
            setStoryAuth([UserRole.TenantAdmin], 7);
            return withAdminProviders(() => (
                <ConfigProvider theme={buildAdminAntdTheme({ scheme })}>
                    <ThemeProvider theme={orisoMuiTheme}>
                        <div
                            style={{
                                minHeight: '100vh',
                                background: 'var(--m3-surface, #fcf9f9)',
                                color: 'var(--m3-on-surface, #1c1b1b)',
                            }}
                        >
                            <Story />
                        </div>
                    </ThemeProvider>
                </ConfigProvider>
            ));
        },
    ],
} satisfies Meta<typeof TeamFunctionsEverywhere>;

export default meta;
type Story = StoryObj<typeof meta>;

/** All places at once, German, light. Same function, same name and description wherever it is set. */
export const AllPlaces: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const counselling = await canvas.findAllByRole('switch', { name: 'Teamberatung' });
        await expect(counselling).toHaveLength(2);
        await expect(await canvas.findAllByRole('switch', { name: 'Team-Chat' })).toHaveLength(1);
        // Read from the locale, not typed again here: the check is "both places show the SAME text".
        await expect(canvas.getAllByText(String(i18n.t('teamFunctions.counselling.description')))).toHaveLength(2);
    },
};

export const AllPlacesEnglish: Story = {
    args: { language: 'en' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findAllByRole('switch', { name: 'Team counselling' })).toHaveLength(2);
        await expect(await canvas.findAllByRole('switch', { name: 'Team chat' })).toHaveLength(1);
    },
};
