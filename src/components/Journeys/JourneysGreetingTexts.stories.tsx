import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect, fn, within } from 'storybook/test';
import { ERSTANTWORT_PLATFORM_QUERY_KEY } from '../../hooks/useErstantwortPlatformTexts.hook';
import { PlatformGreetingSettings } from '../Tenants/AppSettings/ErstantwortSettings/PlatformGreeting';
import { GreetingTextsContext } from './GreetingTexts';
import { standardJourney } from './journey';
import { JourneysSettings } from './index';
import { fakeSuggester, fakeTranslator } from './journeyFakes';

/**
 * **The greeting step edits its own words** (ORISO-Admin#1660, gap 1 of the field mapping).
 *
 * „Begrüßung der Beratungsstelle" opens with the greeting editor of the level being edited — on
 * the platform the editor of the page „Begrüßung", for a Träger or a Beratungsstelle their
 * „Einführung Ratsuchende". It is the same editor on the same store, so nothing moves and the old
 * pages stay. Publishing there is live at once and does not wait for the journey's „Speichern".
 */
const platformTexts = {
    texts: {
        greeting: { de: '<p>Willkommen bei der Online-Beratung. Ihre Nachricht ist angekommen.</p>' },
    },
    builtIn: {
        greeting: { de: 'Schön, dass Sie sich gemeldet haben. Ihre Nachricht ist bei uns angekommen.' },
        closing: { de: 'Bis bald — wir melden uns bei Ihnen.' },
        emergencyNumbers: {
            de: 'Bei einer akuten Notlage erreichen Sie rund um die Uhr die Telefonseelsorge unter 0800 111 0 111.',
        },
    },
};

const u25 = {
    ...standardJourney('AGENCY_COUNSELLING', 'u25', 1),
    name: 'U25',
    routes: { registration: [3], links: [] },
};

const meta = {
    title: 'Settings/Einstellungen/Reisen/Greeting texts',
    id: 'settings-journeys-greeting-texts',
    component: JourneysSettings,
    parameters: {
        layout: 'padded',
        msw: {
            handlers: [
                http.get('*/service/useradmin/erstantwort/platform', () => HttpResponse.json(platformTexts)),
                http.put('*/service/useradmin/erstantwort/platform', () => HttpResponse.json(platformTexts)),
            ],
        },
    },
    decorators: [
        (Story) => {
            const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
            client.setQueryData([ERSTANTWORT_PLATFORM_QUERY_KEY], platformTexts);
            return (
                <QueryClientProvider client={client}>
                    <GreetingTextsContext.Provider value={<PlatformGreetingSettings />}>
                        <Story />
                    </GreetingTextsContext.Provider>
                </QueryClientProvider>
            );
        },
    ],
    args: {
        topics: [{ id: 3, name: '[U25] Suizidprävention' }],
        journeys: [u25],
        translator: fakeTranslator,
        suggester: fakeSuggester,
        canEditAppearance: false,
        onSave: fn(),
        initiallyOpen: {
            type: 'AGENCY_COUNSELLING' as const,
            journeyId: 'u25',
            phase: 'flight',
            stepId: 'u25:agencyGreeting',
        },
    },
} satisfies Meta<typeof JourneysSettings>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Platform level: the greeting step shows the platform's greeting, editable in place. */
export const PlatformGreetingInTheStep: Story = {
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const dialog = await body.findByTestId('journey-step-dialog');
        const texts = await within(dialog).findByTestId('journey-greeting-texts');
        await expect(within(texts).getByText('Texte der Begrüßung')).toBeInTheDocument();
        await expect(await within(texts).findByTestId('platform-greeting-builtin')).toBeInTheDocument();
    },
};

/** Another step has no greeting editor: only „Begrüßung der Beratungsstelle" carries these texts. */
export const OtherStepsHaveNone: Story = {
    args: {
        initiallyOpen: {
            type: 'AGENCY_COUNSELLING' as const,
            journeyId: 'u25',
            phase: 'flight',
            stepId: 'u25:enquiry',
        },
    },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const dialog = await body.findByTestId('journey-step-dialog');
        await expect(within(dialog).queryByTestId('journey-greeting-texts')).not.toBeInTheDocument();
    },
};
