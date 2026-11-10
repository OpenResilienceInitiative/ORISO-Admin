import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { delay, http, HttpResponse } from 'msw';
import { UserRole } from '../../../enums/UserRole';
import { TENANT_DATA_KEY } from '../../../hooks/useTenantData.hook';
import { FIXTURE_TOPICS } from '../../../components/TopicCatalogue/topicCatalogueFixtures';
import { setStoryAuth, withSeededAdminProviders } from '../../../utils/storybook/adminStoryDecorators';
import { TopicList } from './TopicList';

const tenant = {
    id: 1,
    name: 'Demo-Mandant',
    subdomain: 'demo',
    settings: { featureTopicsEnabled: true, topicsInRegistrationEnabled: true },
    licensing: {},
};

const serviceTopics = FIXTURE_TOPICS.map((topic) => ({
    id: topic.id,
    name: topic.name,
    description: topic.description,
    internalIdentifier: `topic-${topic.id}`,
    status: topic.active ? 'ACTIVE' : 'INACTIVE',
}));

const tenantHandlers = [
    http.get('*/service/tenant/public/*', () => HttpResponse.json(tenant)),
    http.get('*/service/tenant/:id', () => HttpResponse.json(tenant)),
    http.get('*/service/tenantadmin/:id', () => HttpResponse.json(tenant)),
];

const meta = {
    title: 'Organisms/Pages/Topics/TopicList',
    component: TopicList,
    parameters: { layout: 'fullscreen' },
    beforeEach: () => setStoryAuth([UserRole.TopicAdmin, UserRole.TenantAdmin], 1),
    decorators: [
        (Story) => withSeededAdminProviders(Story, (client) => client.setQueryData([TENANT_DATA_KEY, 1], tenant)),
    ],
} satisfies Meta<typeof TopicList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** What the service really delivers today: one flat list. The catalogue shows it as one group, with no edit mode. */
export const FlatListFromService: Story = {
    parameters: {
        msw: {
            handlers: [...tenantHandlers, http.get('*/service/topicadmin/', () => HttpResponse.json(serviceTopics))],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByRole('heading', { name: 'Alle Themen' })).toBeInTheDocument();
        await expect(canvas.queryByRole('button', { name: 'Bearbeiten' })).toBeNull();
        await expect(canvas.getAllByRole('switch').length).toBeGreaterThan(5);
    },
};

export const ServiceUnavailable: Story = {
    parameters: {
        msw: {
            handlers: [
                ...tenantHandlers,
                http.get('*/service/topicadmin/', () => new HttpResponse(null, { status: 500 })),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        await expect(await within(canvasElement).findByRole('alert')).toHaveTextContent('nicht geladen werden');
    },
};

/** Two switches in a row while the first save is still running: both unlock again when their own save is done. */
export const TwoTogglesInARow: Story = {
    parameters: {
        msw: {
            handlers: [
                ...tenantHandlers,
                http.get('*/service/topicadmin/', () => HttpResponse.json(serviceTopics)),
                http.get('*/service/topicadmin/:id', ({ params }) =>
                    HttpResponse.json(serviceTopics.find((topic) => String(topic.id) === params.id)),
                ),
                http.put('*/service/topicadmin/:id', async () => {
                    await delay(400);
                    return HttpResponse.json({});
                }),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const switches = await canvas.findAllByRole('switch');
        await userEvent.click(switches[0]);
        await userEvent.click(switches[1]);
        await waitFor(
            async () => {
                const now = await canvas.findAllByRole('switch');
                await expect(now[0]).toBeEnabled();
                await expect(now[1]).toBeEnabled();
            },
            { timeout: 5000 },
        );
    },
};
