import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect, within } from 'storybook/test';
import { http, HttpResponse } from 'msw';
import { ERSTANTWORT_PLATFORM_QUERY_KEY } from '../../../../../hooks/useErstantwortPlatformTexts.hook';
import { PlatformGreetingSettings } from './index';

/** Synthetic platform texts: the admin rewrote the German greeting and translated it to English. */
const platformTexts = {
    texts: {
        greeting: {
            de: '<p>Willkommen bei der Online-Beratung. Ihre Nachricht ist angekommen.</p>',
            en: '<p>Welcome to online counselling. Your message has arrived.</p>',
            en__meta: JSON.stringify({ mt: true, src: 'de', at: '2026-11-16T10:00:00.000Z' }),
        },
    },
    builtIn: {
        greeting: {
            de: 'Schön, dass Sie sich gemeldet haben. Ihre Nachricht ist bei uns angekommen.',
            'de@informal': 'Schön, dass Du Dich gemeldet hast. Deine Nachricht ist bei uns angekommen.',
            en: 'Thank you for getting in touch. Your message has reached us.',
        },
        closing: { de: 'Bis bald — wir melden uns bei Ihnen.', en: 'See you soon — we will get back to you.' },
        emergencyNumbers: {
            de: 'Bei einer akuten Notlage erreichen Sie rund um die Uhr die Telefonseelsorge unter 0800 111 0 111.',
            en: 'In an acute emergency you can reach Telefonseelsorge around the clock on 0800 111 0 111.',
        },
    },
};

const meta = {
    title: 'Settings/Einstellungen/Begrüßung/PlatformGreeting',
    id: 'settings-greeting-platform',
    component: PlatformGreetingSettings,
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
            // Seeded like the Träger editor story: the authenticated fetch wrapper has no token here.
            const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
            client.setQueryData([ERSTANTWORT_PLATFORM_QUERY_KEY], platformTexts);
            return (
                <QueryClientProvider client={client}>
                    <Story />
                </QueryClientProvider>
            );
        },
    ],
} satisfies Meta<typeof PlatformGreetingSettings>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The platform admin's German greeting, with the shipped default shown underneath. */
export const Overridden: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByTestId('platform-greeting-builtin')).toBeInTheDocument();
    },
};
